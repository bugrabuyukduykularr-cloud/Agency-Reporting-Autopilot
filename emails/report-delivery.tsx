import React from "react";
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Img,
  Hr,
  Link,
  Row,
  Column,
} from "@react-email/components";

export interface ReportDeliveryEmailProps {
  clientName: string;
  periodLabel: string;
  agencyName: string;
  agencyLogoUrl: string | null;
  agencyPrimaryColor: string;
  reportViewerUrl: string;
  pdfDownloadUrl: string;
  recipientEmail: string;
  replyToEmail: string;
}

export default function ReportDeliveryEmail(props: ReportDeliveryEmailProps) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const publicLinkId = props.reportViewerUrl.split("/").pop() ?? "";
  const trackingPixelUrl = `${appUrl}/api/track/open?r=${encodeURIComponent(publicLinkId)}&e=${encodeURIComponent(props.recipientEmail)}`;

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
          {/* Header bar */}
          <Section
            style={{
              backgroundColor: props.agencyPrimaryColor,
              padding: "16px 24px",
            }}
          >
            {props.agencyLogoUrl ? (
              <Img
                src={props.agencyLogoUrl}
                alt={props.agencyName}
                width="120"
                style={{ maxHeight: "40px" }}
              />
            ) : (
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: "18px",
                  fontWeight: "bold",
                  margin: 0,
                }}
              >
                {props.agencyName}
              </Text>
            )}
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
              Your {props.periodLabel} Report is Ready
            </Text>

            <Text
              style={{
                fontSize: "14px",
                color: "#475569",
                lineHeight: "1.6",
                marginBottom: "24px",
              }}
            >
              Hi there! Your marketing performance report for{" "}
              <strong>{props.periodLabel}</strong> has been generated and is
              ready for review.
            </Text>

            {/* CTA Buttons */}
            <Row>
              <Column>
                <Button
                  href={props.reportViewerUrl}
                  style={{
                    backgroundColor: props.agencyPrimaryColor,
                    color: "#FFFFFF",
                    padding: "12px 24px",
                    borderRadius: "8px",
                    textDecoration: "none",
                    fontWeight: "600",
                    fontSize: "14px",
                    display: "inline-block",
                    marginBottom: "12px",
                  }}
                >
                  View Report Online
                </Button>
              </Column>
            </Row>

            <Row>
              <Column>
                <Button
                  href={props.pdfDownloadUrl}
                  style={{
                    backgroundColor: "transparent",
                    color: props.agencyPrimaryColor,
                    padding: "12px 24px",
                    borderRadius: "8px",
                    border: `2px solid ${props.agencyPrimaryColor}`,
                    textDecoration: "none",
                    fontWeight: "600",
                    fontSize: "14px",
                    display: "inline-block",
                  }}
                >
                  Download PDF
                </Button>
              </Column>
            </Row>

            <Hr style={{ borderColor: "#E2E8F0", margin: "24px 0" }} />

            <Text
              style={{
                fontSize: "13px",
                color: "#94A3B8",
                lineHeight: "1.5",
              }}
            >
              This report includes insights from your connected platforms and
              AI-powered recommendations to help improve your marketing
              performance.
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
                fontSize: "12px",
                color: "#94A3B8",
                margin: 0,
                textAlign: "center" as const,
              }}
            >
              Questions? Contact us at{" "}
              <Link
                href={`mailto:${props.replyToEmail}`}
                style={{ color: props.agencyPrimaryColor }}
              >
                {props.replyToEmail}
              </Link>
            </Text>
            <Text
              style={{
                fontSize: "11px",
                color: "#CBD5E1",
                margin: "8px 0 0",
                textAlign: "center" as const,
              }}
            >
              Delivered by {props.agencyName} · Powered by Agency Reporting
              Autopilot
            </Text>
          </Section>
        </Container>

        {/* Tracking pixel */}
        <Img
          src={trackingPixelUrl}
          width="1"
          height="1"
          alt=""
          style={{ display: "block" }}
        />
      </Body>
    </Html>
  );
}

ReportDeliveryEmail.PreviewProps = {
  clientName: "Apex Digital",
  periodLabel: "January 2026",
  agencyName: "My Agency",
  agencyLogoUrl: null,
  agencyPrimaryColor: "#3B82F6",
  reportViewerUrl: "https://app.example.com/r/abc123",
  pdfDownloadUrl: "https://storage.example.com/report.pdf",
  recipientEmail: "client@company.com",
  replyToEmail: "hello@myagency.com",
} as ReportDeliveryEmailProps;
