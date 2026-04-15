/**
 * Generate a 100-year self-signed SSL certificate for local HTTPS development.
 * Uses Node.js built-in crypto module — no external dependencies needed.
 *
 * Run: node generate-cert.mjs
 * Output: certificates/localhost-key.pem & certificates/localhost.pem
 */
import { generateKeyPairSync, createSign, randomBytes } from "crypto";
import { mkdirSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const certDir = join(__dirname, "certificates");

if (!existsSync(certDir)) mkdirSync(certDir, { recursive: true });

// 1. Generate RSA 2048-bit key pair
const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

// 2. Build a self-signed X.509 certificate (100 years = 36500 days)
//    Node 20+ has crypto.X509Certificate but not creation API,
//    so we build the ASN.1 DER manually.

function encodeLength(len) {
    if (len < 0x80) return Buffer.from([len]);
    if (len < 0x100) return Buffer.from([0x81, len]);
    return Buffer.from([0x82, (len >> 8) & 0xff, len & 0xff]);
}

function encodeTLV(tag, value) {
    const len = encodeLength(value.length);
    return Buffer.concat([Buffer.from([tag]), len, value]);
}

function encodeOID(oid) {
    const parts = oid.split(".").map(Number);
    const bytes = [40 * parts[0] + parts[1]];
    for (let i = 2; i < parts.length; i++) {
        let val = parts[i];
        if (val < 128) {
            bytes.push(val);
        } else {
            const tmp = [];
            tmp.push(val & 0x7f);
            val >>= 7;
            while (val > 0) {
                tmp.push((val & 0x7f) | 0x80);
                val >>= 7;
            }
            tmp.reverse();
            bytes.push(...tmp);
        }
    }
    return encodeTLV(0x06, Buffer.from(bytes));
}

function encodeInteger(buf) {
    if (buf[0] & 0x80) buf = Buffer.concat([Buffer.from([0x00]), buf]);
    return encodeTLV(0x02, buf);
}

function encodeUTCTime(date) {
    const s = date.toISOString().replace(/[-:T]/g, "").slice(2, 14) + "Z";
    return encodeTLV(0x17, Buffer.from(s, "ascii"));
}

function encodeGeneralizedTime(date) {
    const s = date.toISOString().replace(/[-:T]/g, "").slice(0, 14) + "Z";
    return encodeTLV(0x18, Buffer.from(s, "ascii"));
}

function encodeUTF8String(str) {
    return encodeTLV(0x0c, Buffer.from(str, "utf8"));
}

function encodePrintableString(str) {
    return encodeTLV(0x13, Buffer.from(str, "ascii"));
}

function encodeSequence(...items) {
    return encodeTLV(0x30, Buffer.concat(items));
}

function encodeSet(...items) {
    return encodeTLV(0x31, Buffer.concat(items));
}

// Subject/Issuer: CN=localhost, O=SCSVMV, OU=VMS, L=Kanchipuram, ST=TamilNadu, C=IN
function buildName() {
    const attrs = [
        ["2.5.4.6", encodePrintableString("IN")],           // C
        ["2.5.4.8", encodeUTF8String("TamilNadu")],         // ST
        ["2.5.4.7", encodeUTF8String("Kanchipuram")],       // L
        ["2.5.4.10", encodeUTF8String("SCSVMV")],           // O
        ["2.5.4.11", encodeUTF8String("VMS")],              // OU
        ["2.5.4.3", encodeUTF8String("localhost")],          // CN
    ];
    return encodeSequence(
        ...attrs.map(([oid, val]) => encodeSet(encodeSequence(encodeOID(oid), val)))
    );
}

// Parse the public key from PEM to DER
function pubKeyDER() {
    const b64 = publicKey.replace(/-----[^-]+-----/g, "").replace(/\s/g, "");
    return Buffer.from(b64, "base64");
}

// Build SubjectAltName extension: DNS:localhost, IP:127.0.0.1, IP:0.0.0.0
function buildSANExtension() {
    const dnsName = encodeTLV(0x82, Buffer.from("localhost", "ascii"));
    const ip1 = encodeTLV(0x87, Buffer.from([127, 0, 0, 1]));
    const ip2 = encodeTLV(0x87, Buffer.from([0, 0, 0, 0]));
    const sanValue = encodeSequence(dnsName, ip1, ip2);
    // Wrap in OCTET STRING
    const sanOctet = encodeTLV(0x04, sanValue);
    // Extension: OID 2.5.29.17, critical=false, value
    return encodeSequence(encodeOID("2.5.29.17"), sanOctet);
}

// Build BasicConstraints extension: CA:TRUE
function buildBasicConstraints() {
    const bc = encodeSequence(encodeTLV(0x01, Buffer.from([0xff]))); // cA = TRUE
    const bcOctet = encodeTLV(0x04, bc);
    return encodeSequence(
        encodeOID("2.5.29.19"),
        encodeTLV(0x01, Buffer.from([0xff])), // critical
        bcOctet
    );
}

// Build TBS Certificate
const serialNumber = encodeInteger(randomBytes(16));
const now = new Date();
const notAfter = new Date(now);
notAfter.setFullYear(notAfter.getFullYear() + 100);

const signatureAlgId = encodeSequence(
    encodeOID("1.2.840.113549.1.1.11"), // sha256WithRSAEncryption
    encodeTLV(0x05, Buffer.alloc(0))     // NULL
);

const issuer = buildName();
const subject = buildName();
const validity = encodeSequence(
    encodeUTCTime(now),
    encodeGeneralizedTime(notAfter)
);

const extensions = encodeTLV(
    0xa3,
    encodeSequence(buildBasicConstraints(), buildSANExtension())
);

const tbsCertificate = encodeSequence(
    encodeTLV(0xa0, encodeInteger(Buffer.from([0x02]))), // version v3
    serialNumber,
    signatureAlgId,
    issuer,
    validity,
    subject,
    pubKeyDER(), // SubjectPublicKeyInfo (already DER-encoded from Node)
    extensions
);

// 3. Sign the TBS certificate
const sign = createSign("SHA256");
sign.update(tbsCertificate);
const signature = sign.sign(privateKey);

// Wrap signature in BIT STRING
const sigBitString = encodeTLV(0x03, Buffer.concat([Buffer.from([0x00]), signature]));

// 4. Full certificate
const certificate = encodeSequence(tbsCertificate, signatureAlgId, sigBitString);

// 5. Write PEM files
const certPEM = `-----BEGIN CERTIFICATE-----\n${certificate.toString("base64").match(/.{1,64}/g).join("\n")}\n-----END CERTIFICATE-----\n`;

writeFileSync(join(certDir, "localhost.pem"), certPEM);
writeFileSync(join(certDir, "localhost-key.pem"), privateKey);

console.log("✅ 100-year self-signed SSL certificate generated:");
console.log(`   📁 ${join(certDir, "localhost.pem")}`);
console.log(`   🔑 ${join(certDir, "localhost-key.pem")}`);
console.log(`   📅 Valid: ${now.toLocaleDateString()} → ${notAfter.toLocaleDateString()}`);
console.log(`   🔒 Subject: CN=localhost, O=SCSVMV, OU=VMS`);
console.log(`   🌐 SAN: DNS:localhost, IP:127.0.0.1, IP:0.0.0.0`);
