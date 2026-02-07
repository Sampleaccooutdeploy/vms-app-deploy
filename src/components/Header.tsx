"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import styles from "./Header.module.css";
import {
    HomeIcon,
    UserGroupIcon,
    IdentificationIcon,
    SunIcon,
    MoonIcon,
    Bars3Icon,
    XMarkIcon
} from "@heroicons/react/24/outline";

export default function Header() {
    const pathname = usePathname();
    const [isDark, setIsDark] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    // Initialize theme from localStorage
    useEffect(() => {
        const savedTheme = localStorage.getItem("theme");
        if (savedTheme === "dark") {
            setIsDark(true);
            document.documentElement.classList.add("dark");
        }
    }, []);

    // Close menu on route change
    useEffect(() => {
        setMenuOpen(false);
    }, [pathname]);

    // Toggle theme
    const toggleTheme = () => {
        setIsDark(!isDark);
        if (!isDark) {
            document.documentElement.classList.add("dark");
            localStorage.setItem("theme", "dark");
        } else {
            document.documentElement.classList.remove("dark");
            localStorage.setItem("theme", "light");
        }
    };

    const isActive = (path: string) => pathname === path;

    // Show minimal header on /register (logo + theme toggle only)
    if (pathname === "/register") {
        return (
            <header className={styles.header}>
                <div className={styles.container}>
                    <div className={styles.logoSection}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/logo.png" alt="SCSVMV Logo" className={styles.logo} draggable="false" />
                    </div>
                    <button onClick={toggleTheme} className={styles.themeToggle} aria-label="Toggle dark mode">
                        {isDark ? <SunIcon className={styles.themeIcon} /> : <MoonIcon className={styles.themeIcon} />}
                    </button>
                </div>
            </header>
        );
    }

    // Show minimal header on admin routes
    if (pathname.startsWith("/admin") || pathname === "/security" || pathname === "/login") {
        return (
            <header className={styles.header}>
                <div className={styles.container}>
                    <div className={styles.logoSection}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/logo.png" alt="SCSVMV Logo" className={styles.logo} draggable="false" />
                    </div>
                    <div className={styles.rightSection}>
                        <nav className={styles.nav}>
                            <Link href="/login" className={`${styles.navLink} ${isActive("/login") || pathname.startsWith("/admin") ? styles.active : ""}`}>
                                <UserGroupIcon className={styles.icon} />
                                <span>Admin/Staff</span>
                            </Link>
                        </nav>
                        <button onClick={toggleTheme} className={styles.themeToggle} aria-label="Toggle dark mode">
                            {isDark ? <SunIcon className={styles.themeIcon} /> : <MoonIcon className={styles.themeIcon} />}
                        </button>
                    </div>
                </div>
            </header>
        );
    }

    return (
        <header className={styles.header}>
            <div className={styles.container}>
                <div className={styles.logoSection}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/logo.png" alt="SCSVMV Logo" className={styles.logo} draggable="false" />
                </div>

                <div className={styles.rightSection}>
                    {/* Hamburger button for mobile */}
                    <button
                        className={styles.hamburger}
                        onClick={() => setMenuOpen(!menuOpen)}
                        aria-label={menuOpen ? "Close menu" : "Open menu"}
                        aria-expanded={menuOpen}
                    >
                        {menuOpen ? <XMarkIcon className={styles.hamburgerIcon} /> : <Bars3Icon className={styles.hamburgerIcon} />}
                    </button>

                    <nav className={`${styles.nav} ${menuOpen ? styles.navOpen : ""}`}>
                        <Link href="/" className={`${styles.navLink} ${isActive("/") ? styles.active : ""}`} onClick={() => setMenuOpen(false)}>
                            <HomeIcon className={styles.icon} />
                            <span>Home</span>
                        </Link>
                        <Link href="/register" className={`${styles.navLink} ${isActive("/register") ? styles.active : ""}`} onClick={() => setMenuOpen(false)}>
                            <IdentificationIcon className={styles.icon} />
                            <span>Visitor Registration</span>
                        </Link>
                        <Link href="/login" className={`${styles.navLink} ${isActive("/login") || pathname.startsWith("/admin") ? styles.active : ""}`} onClick={() => setMenuOpen(false)}>
                            <UserGroupIcon className={styles.icon} />
                            <span>Admin/Staff</span>
                        </Link>
                    </nav>

                    <button onClick={toggleTheme} className={styles.themeToggle} aria-label="Toggle dark mode">
                        {isDark ? <SunIcon className={styles.themeIcon} /> : <MoonIcon className={styles.themeIcon} />}
                    </button>
                </div>
            </div>
        </header>
    );
}
