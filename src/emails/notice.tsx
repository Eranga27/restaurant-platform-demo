import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";

import type { Brand } from "@/config/brand";

export type NoticeEmailProps = {
  brand: Brand;
  lang: string;
  text: {
    preview: string;
    heading: string;
    intro: string;
    rows: { label: string; value: string }[];
    note?: string;
    button: string;
    footer: string;
  };
  url: string;
};

/**
 * Booking and event emails: a heading, a short message, a few details and a
 * button to the guest's private page. Inline styles only.
 */
export function NoticeEmail({ brand, lang, text, url }: NoticeEmailProps) {
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
            {text.rows.map((row) => (
              <Row key={row.label} style={{ marginBottom: "10px" }}>
                <Column style={{ width: "40%", verticalAlign: "top" }}>
                  <Text style={muted}>{row.label}</Text>
                </Column>
                <Column style={{ verticalAlign: "top" }}>
                  <Text style={{ fontSize: "15px", margin: 0 }}>{row.value}</Text>
                </Column>
              </Row>
            ))}
            {text.note && (
              <Text style={{ fontSize: "14px", margin: "16px 0", color: colors.foreground }}>
                {text.note}
              </Text>
            )}
            <Button
              href={url}
              style={{
                backgroundColor: colors.primary,
                color: colors.primaryForeground,
                borderRadius: "10px",
                padding: "14px 22px",
                fontSize: "15px",
                fontWeight: 600,
                marginTop: "8px",
              }}
            >
              {text.button}
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
