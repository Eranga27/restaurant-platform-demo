import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";

import type { Brand } from "@/config/brand";

export type ConfirmationLine = {
  quantity: number;
  name: string;
  details: string;
  totalLabel: string;
};

export type OrderConfirmationProps = {
  brand: Brand;
  lang: string;
  text: {
    preview: string;
    heading: string;
    intro: string;
    orderNumberLabel: string;
    orderNumber: string;
    whenLabel: string;
    when: string;
    whereLabel: string;
    where: string;
    itemsLabel: string;
    totals: { label: string; value: string; strong?: boolean }[];
    payment: string;
    track: string;
    footer: string;
  };
  lines: ConfirmationLine[];
  trackingUrl: string;
};

/** Order confirmation email. Inline styles only: email clients ignore stylesheets. */
export function OrderConfirmationEmail({
  brand,
  lang,
  text,
  lines,
  trackingUrl,
}: OrderConfirmationProps) {
  const { colors } = brand;
  const muted = { color: "#6e5b4b", fontSize: "14px", margin: "0" };

  return (
    <Html lang={lang}>
      <Head />
      <Preview>{text.preview}</Preview>
      <Body
        style={{
          backgroundColor: colors.background,
          fontFamily: "Helvetica, Arial, sans-serif",
          margin: 0,
        }}
      >
        <Container style={{ maxWidth: "560px", margin: "0 auto", padding: "24px 16px" }}>
          <Section
            style={{
              backgroundColor: colors.primary,
              borderRadius: "16px 16px 0 0",
              padding: "24px",
            }}
          >
            <Text
              style={{ color: colors.accent, fontSize: "12px", letterSpacing: "2px", margin: 0 }}
            >
              {brand.tagline.toUpperCase()}
            </Text>
            <Heading
              as="h1"
              style={{ color: colors.primaryForeground, fontSize: "26px", margin: "8px 0 0" }}
            >
              {brand.name}
            </Heading>
          </Section>

          <Section
            style={{ backgroundColor: "#ffffff", padding: "24px", borderRadius: "0 0 16px 16px" }}
          >
            <Heading
              as="h2"
              style={{ color: colors.foreground, fontSize: "20px", margin: "0 0 8px" }}
            >
              {text.heading}
            </Heading>
            <Text style={{ color: colors.foreground, fontSize: "15px", margin: "0 0 16px" }}>
              {text.intro}
            </Text>

            <Row style={{ marginBottom: "16px" }}>
              <Column>
                <Text style={muted}>{text.orderNumberLabel}</Text>
                <Text
                  style={{ fontSize: "20px", fontWeight: 700, letterSpacing: "2px", margin: 0 }}
                >
                  {text.orderNumber}
                </Text>
              </Column>
              <Column>
                <Text style={muted}>{text.whenLabel}</Text>
                <Text style={{ fontSize: "15px", margin: 0 }}>{text.when}</Text>
              </Column>
            </Row>
            <Text style={muted}>{text.whereLabel}</Text>
            <Text style={{ fontSize: "15px", margin: "0 0 16px" }}>{text.where}</Text>

            <Hr style={{ borderColor: "#e6d8c4" }} />
            <Text style={{ ...muted, margin: "12px 0 8px" }}>{text.itemsLabel}</Text>
            {lines.map((line, i) => (
              <Row key={i} style={{ marginBottom: "8px" }}>
                <Column style={{ width: "36px", verticalAlign: "top" }}>
                  <Text style={{ margin: 0, fontSize: "15px" }}>{line.quantity}×</Text>
                </Column>
                <Column style={{ verticalAlign: "top" }}>
                  <Text style={{ margin: 0, fontSize: "15px" }}>{line.name}</Text>
                  {line.details && (
                    <Text style={{ ...muted, fontSize: "13px" }}>{line.details}</Text>
                  )}
                </Column>
                <Column style={{ width: "120px", textAlign: "right", verticalAlign: "top" }}>
                  <Text style={{ margin: 0, fontSize: "15px" }}>{line.totalLabel}</Text>
                </Column>
              </Row>
            ))}
            <Hr style={{ borderColor: "#e6d8c4" }} />
            {text.totals.map((row) => (
              <Row key={row.label}>
                <Column>
                  <Text
                    style={{
                      margin: "2px 0",
                      fontSize: "14px",
                      fontWeight: row.strong ? 700 : 400,
                    }}
                  >
                    {row.label}
                  </Text>
                </Column>
                <Column style={{ textAlign: "right" }}>
                  <Text
                    style={{
                      margin: "2px 0",
                      fontSize: "14px",
                      fontWeight: row.strong ? 700 : 400,
                    }}
                  >
                    {row.value}
                  </Text>
                </Column>
              </Row>
            ))}
            <Text style={{ fontSize: "14px", margin: "16px 0" }}>{text.payment}</Text>

            <Button
              href={trackingUrl}
              style={{
                backgroundColor: colors.primary,
                color: colors.primaryForeground,
                borderRadius: "10px",
                padding: "14px 22px",
                fontSize: "15px",
                fontWeight: 600,
              }}
            >
              {text.track}
            </Button>
          </Section>

          <Text style={{ ...muted, fontSize: "12px", textAlign: "center", marginTop: "16px" }}>
            {text.footer}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
