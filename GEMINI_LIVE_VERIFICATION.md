# Gemini Clinical Summary — Live Verification Gate

สถานะของโค้ดชุดนี้: **พร้อมสำหรับ Live Verification แต่ยังไม่ถือว่า Live Verified**
จนกว่าจะเรียก Gemini API ด้วย key จริงและได้ผล PASS ครบทุกข้อ

## สิ่งที่ระบบตรวจ

- โหลด `GEMINI_API_KEY` และ `GEMINI_MODEL` จาก `.env.local` โดยอัตโนมัติ
- เรียก `gemini-3.7-flash` ผ่าน Gemini `generateContent`
- ส่ง system prompt ผ่าน `systemInstruction`
- รวมข้อความจากทุก `candidates[0].content.parts[].text`
- ตรวจว่า summary ไม่ว่าง
- ตรวจว่า disclaimer ด้าน clinical authority ยังคงอยู่
- ตรวจว่า `generatedAt` เป็น timestamp ที่ถูกต้อง
- คืน exit code ที่ไม่ใช่ 0 หาก assertion ใดไม่ผ่าน
- ปฏิเสธ HTTP 200 ที่ไม่มี summary เพื่อส่งต่อให้ circuit breaker/fallback

## วิธีรัน

1. สร้าง `.env.local` ที่ root ของโปรเจกต์:

   ```env
   GEMINI_API_KEY=ใส่_api_key_จริงที่นี่
   GEMINI_MODEL=gemini-3.7-flash
   ```

2. ติดตั้ง dependencies และรัน:

   ```bash
   npm install
   npm run test:clinical-summary-contract
   npm run test:clinical-summary-gemini
   ```

`test:clinical-summary-contract` ไม่เรียก API จริง ใช้ยืนยัน request shape,
response parsing และ fail-closed เมื่อ Gemini ตอบว่างก่อนเริ่ม live test

> ห้าม commit `.env.local` หรือส่ง API key มาในแชต

## เกณฑ์ปิดข้อ ①

ต้องเห็น `[PASS]` ครบ 3 บรรทัด สคริปต์จบด้วย exit code 0 และผู้ทดสอบอ่าน
summary แล้วพบว่าเป็นภาษาไทยที่เข้าใจได้และอ้างอิงเฉพาะข้อมูลตัวอย่างที่ส่งเข้าไป

ผลที่ถูกต้องควรบันทึกว่า:

`Gemini Clinical Summary Integration: LIVE VERIFIED`

ไม่ควรใช้คำว่า `Clinical Summary Agent: SAFE` เพราะการเรียกสำเร็จหนึ่งครั้งพิสูจน์
integration path ไม่ได้พิสูจน์ clinical safety ทั้งระบบ
