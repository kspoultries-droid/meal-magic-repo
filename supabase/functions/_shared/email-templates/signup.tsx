/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="ur" dir="rtl">
    <Head>
      <style>{darkModeCss}</style>
    </Head>
    <Preview>{siteName} — ای میل کی تصدیق</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>اپنی ای میل کی تصدیق کریں</Heading>
        <Text style={text}>
          اکاؤنٹ بنانے کا شکریہ — {' '}
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
          !
        </Text>
        <Text style={text}>
          اپنی ای میل (
          <Link href={`mailto:${recipient}`} style={link}>
            {recipient}
          </Link>
          ) کی تصدیق کے لیے نیچے بٹن دبائیں:
        </Text>
        <Button className="dm-btn" style={button} href={confirmationUrl}>
          ای میل کی تصدیق کریں
        </Button>
        <Text style={footer}>
          اگر آپ نے اکاؤنٹ نہیں بنایا تو اس ای میل کو نظرانداز کریں۔
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: '"Noto Sans Arabic", Tahoma, Arial, sans-serif' }
const container = { padding: '20px 25px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: 'hsl(160, 10%, 10%)',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: 'hsl(160, 5%, 39%)',
  lineHeight: '1.5',
  margin: '0 0 25px',
}
const link = { color: 'inherit', textDecoration: 'underline' }
const button = {
  backgroundColor: 'hsl(152, 69%, 40%)',
  color: '#ffffff',
  fontSize: '14px',
  border: '1px solid hsl(152, 69%, 40%)',
  borderRadius: '8px',
  padding: '12px 20px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
// Rendered as a text child, which React may HTML-escape: keep this CSS free of >, &, and quotes.
const darkModeCss = `
  @media (prefers-color-scheme: dark) {
    .dm-btn { background-color: hsl(152, 69%, 40%) !important; color: #ffffff !important; }
  }
  [data-ogsc] .dm-btn { background-color: hsl(152, 69%, 40%) !important; color: #ffffff !important; }
  [data-ogsb] .dm-btn { background-color: hsl(152, 69%, 40%) !important; color: #ffffff !important; }
`
