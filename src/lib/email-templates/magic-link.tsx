import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your sign-in link for {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Welcome back to {siteName}</Heading>
        <Text style={text}>
          Tap the button below to sign in. This link expires shortly and can
          only be used once.
        </Text>
        <Section style={buttonWrap}>
          <Button style={button} href={confirmationUrl}>
            Sign in
          </Button>
        </Section>
        <Text style={footer}>
          If you didn't request this, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    "'Nunito', 'Helvetica Neue', Helvetica, Arial, sans-serif",
}
const container = {
  maxWidth: '440px',
  margin: '0 auto',
  padding: '32px 28px',
  backgroundColor: '#faf8f5',
  borderRadius: '20px',
}
const h1 = {
  fontFamily: "'Quicksand', 'Helvetica Neue', Helvetica, Arial, sans-serif",
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#2b2b2b',
  margin: '0 0 18px',
}
const text = {
  fontSize: '15px',
  color: '#55555a',
  lineHeight: '1.6',
  margin: '0 0 24px',
}
const buttonWrap = { textAlign: 'center' as const, margin: '0 0 8px' }
const button = {
  backgroundColor: '#2b2b2b',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  borderRadius: '999px',
  padding: '13px 32px',
  textDecoration: 'none',
  display: 'inline-block',
}
const codeSection = {
  textAlign: 'center' as const,
  margin: '24px 0 8px',
}
const codeLabel = {
  fontSize: '13px',
  color: '#8a8a90',
  margin: '0 0 6px',
}
const codeStyle = {
  fontFamily: "'Quicksand', 'Courier New', monospace",
  fontSize: '30px',
  fontWeight: 'bold' as const,
  letterSpacing: '8px',
  color: '#2b2b2b',
  margin: '0',
}
const footer = {
  fontSize: '12px',
  color: '#a8a8ae',
  margin: '28px 0 0',
  textAlign: 'center' as const,
}
