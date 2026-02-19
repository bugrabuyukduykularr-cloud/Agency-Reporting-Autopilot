import React from "react";
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Hr,
} from "@react-email/components";

export interface ReportFailedEmailProps {
  clientName: string;
  periodLabel: string;
  agencyName: string;
  errorMessage: string;
  clientSettingsUrl: string;
}

export default function ReportFailedEmail(props: ReportFailedEmailProps) {
  return (
    <Html>
      <Head />
      <Body
        style={{
          backgroundColor: "#F8FAFC",
          fontFamily: "Arial, Helvetica, sans-serif",
          padding: "20px 0",
        }}
      >
        <Container
          style={{
            backgroundColor: "#FFFFFF",
            maxWidth: "600px",
            margin: "0 auto",
            borderRadius: "12px",
            overflow: "hidden",
            border: "1px solid #E2E8F0",
          }}
        >
          {/* Header bar — red accent */}
          <Section
            style={{
              backgroundColor: "#DC2626",
              padding: "16px 24px",
            }}
          >
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: "18px",
                fontWeight: "bold",
                margin: 0,
              }}
            >
              {props.agencyName} — Report Alert
            </Text>
          </Section>

          {/* Main content */}
          <Section style={{ padding: "32px 24px" }}>
            <Text
              style={{
                fontSize: "20px",
                fontWeight: "bold",
                color: "#0F172A",
                marginBottom: "8px",
              }}
            >
              Report Generation Failed
            </Text>

            <Text
              style={{
                fontSize: "14px",
                color: "#475569",
                lineHeight: "1.6",
                marginBottom: "16px",
              }}
            >
              We encountered an error while generating the{" "}
              <strong>{props.periodLabel}</strong> report for{" "}
              <strong>{props.clientName}</strong>.
            </Text>

            {/* Error box */}
            <Section
              style={{
                backgroundColor: "#FEF2F2",
                border: "1px solid #FECACA",
                borderRadius: "8px",
                padding: "12px 16px",
                marginBottom: "24px",
              }}
            >
              <Text
                style={{
                  fontSize: "12px",
                  fontWeight: "bold",
                  color: "#991B1B",
                  margin: "0 0 4px 0",
                }}
              >
                Error Details
              </Text>
              <Text
                style={{
                  fontSize: "13px",
                  color: "#B91C1C",
                  margin: 0,
                  fontFamily: "Courier New, monospace",
                }}
              >
                {props.errorMessage}
              </Text>
            </Section>

            <Button
              href={props.clientSettingsUrl}
              style={{
                backgroundColor: "#0F172A",
                color: "#FFFFFF",
                padding: "12px 24px",
                borderRadius: "8px",
                textDecoration: "none",
                fontWeight: "600",
                fontSize: "14px",
                display: "inline-block",
              }}
            >
              View Client Settings
            </Button>

            <Hr style={{ borderColor: "#E2E8F0", margin: "24px 0" }} />

            <Text
              style={{
                fontSize: "13px",
                color: "#94A3B8",
                lineHeight: "1.5",
              }}
            >
              You can manually retry generation from the client page. Common
              causes: expired OAuth tokens, API rate limits, or missing data
              connections.
            </Text>
          </Section>

          {/* Footer */}
          <Section
            style={{
              backgroundColor: "#F8FAFC",
              padding: "16px 24px",
              borderTop: "1px solid #E2E8F0",
            }}
          >
            <Text
              style={{
                fontSize: "11px",
                color: "#CBD5E1",
                margin: 0,
                textAlign: "center" as const,
              }}
            >
              Agency Reporting Autopilot — Automated Alert
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

ReportFailedEmail.PreviewProps = {
  clientName: "Apex Digital",
  periodLabel: "January 2026",
  agencyName: "My Agency",
  errorMessage: "Failed to fetch Google Analytics data: Token expired",
  clientSettingsUrl: "https://app.example.com/clients/abc123",
} as ReportFailedEmailProps;
