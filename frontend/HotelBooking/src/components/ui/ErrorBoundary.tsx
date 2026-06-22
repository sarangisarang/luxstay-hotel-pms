"use client";

import React, { Component, ReactNode } from "react";
import styles from "@/styles/ErrorBoundary.module.css";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    message: string;
}

export default class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, message: "" };
    }

    static getDerivedStateFromError(error: unknown): State {
        const message = error instanceof Error ? error.message : "An unexpected error occurred.";
        return { hasError: true, message };
    }

    componentDidCatch(error: unknown, info: React.ErrorInfo) {
        console.error("[ErrorBoundary]", error, info.componentStack);
    }

    reset = () => this.setState({ hasError: false, message: "" });

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;

            return (
                <div className={styles.container} role="alert">
                    <div className={styles.card}>
                        <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <h2 className={styles.title}>Something went wrong</h2>
                        <p className={styles.message}>{this.state.message}</p>
                        <button className={styles.btn} onClick={this.reset}>Try again</button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
