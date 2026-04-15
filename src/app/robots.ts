import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: "*",
                allow: ["/register", "/login"],
                disallow: ["/admin/", "/security/", "/api/"],
            },
        ],
        sitemap: `${process.env.NEXT_PUBLIC_SITE_URL || "https://vms.scsvmv.ac.in"}/sitemap.xml`,
    };
}
