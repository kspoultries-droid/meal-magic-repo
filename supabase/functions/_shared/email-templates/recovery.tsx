/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="ur" dir="rtl">
    <Head>
      <style>{darkModeCss}</style>
    </Head>
    <Preview>{siteName} — پاسورڈ تبدیل کریں</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>نیا پاسورڈ بنائیں</Heading>
        <Text style={text}>
          {siteName} کا پاسورڈ تبدیل کرنے کی درخواست ملی ہے۔ نیا پاسورڈ بنانے کے لیے نیچے بٹن دبائیں۔
        </Text>
        <Button className="dm-btn" style={button} href={confirmationUrl}>
          پاسورڈ تبدیل کریں
        </Button>
        <Text style={footer}>
          اگر یہ درخواست آپ نے نہیں کی تو ای میل نظرانداز کریں؛ آپ کا پاسورڈ تبدیل نہیں ہوگا۔
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

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
