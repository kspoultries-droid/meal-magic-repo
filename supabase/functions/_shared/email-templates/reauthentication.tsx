/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="ur" dir="rtl">
    <Head />
    <Preview>آپ کا تصدیقی کوڈ</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>اپنی شناخت کی تصدیق کریں</Heading>
        <Text style={text}>اپنی شناخت کی تصدیق کے لیے یہ کوڈ استعمال کریں:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          یہ کوڈ محدود وقت کے لیے ہے۔ اگر درخواست آپ نے نہیں کی تو ای میل نظرانداز کریں۔
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

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
const codeStyle = {
  fontFamily: 'Courier, monospace',
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: 'hsl(160, 10%, 10%)',
  margin: '0 0 30px',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
