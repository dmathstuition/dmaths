"use client";
import { Component, type ReactNode } from "react";
import * as Sentry from "@sentry/nextjs";
import PortalErrorState from "@/components/PortalErrorState";

type Props = { children: ReactNode; home?: string };
type State = { error: Error | null };

// Catches render errors inside a portal shell and shows the designed,
// offline-aware fallback (PortalErrorState) in place of the broken content —
// the shell around it (nav, bell) stays put. Reports to Sentry, and never shows
// a raw error message to a learner.
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    Sentry.captureException(error);
    console.error(error);
  }

  render() {
    if (this.state.error) {
      return (
        <PortalErrorState
          reset={() => this.setState({ error: null })}
          home={this.props.home ?? "/portal"}
        />
      );
    }
    return this.props.children;
  }
}
