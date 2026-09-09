# OneChat Documentation Index

## เอกสารหลัก

- [../README.md](../README.md) — project overview and architecture summary
- [ONECHAT-BOOTSTRAP-PLAN.md](ONECHAT-BOOTSTRAP-PLAN.md) — องค์ประกอบการเริ่มสร้างใหม่และแผนพัฒนาระบบ
- [ONECHAT-TECHNICAL-SPEC.md](ONECHAT-TECHNICAL-SPEC.md) — specification ของระบบและ business logic
- [ONECHAT-ROADMAP.md](ONECHAT-ROADMAP.md) — road map แบ่งลำดับการพัฒนาต่อเนื่อง

## เอกสารอ้างอิงจากโค้ด

- [../src/supabase-schema.sql](../src/supabase-schema.sql) — schema หลักของฐานข้อมูล
- [../src/omnichannel-webhook.gs](../src/omnichannel-webhook.gs) — webhook gateway
- [../src/line-oa-hub-chat.html](../src/line-oa-hub-chat.html) — UI prototype / inbox prototype

## Suggested Development Order

1. Review the project overview in [../README.md](../README.md)
2. Read the bootstrap plan in [ONECHAT-BOOTSTRAP-PLAN.md](ONECHAT-BOOTSTRAP-PLAN.md)
3. Use the technical spec in [ONECHAT-TECHNICAL-SPEC.md](ONECHAT-TECHNICAL-SPEC.md) as the implementation guide
4. Follow the product roadmap in [ONECHAT-ROADMAP.md](ONECHAT-ROADMAP.md)
5. Rebuild the system as production backend + modern frontend when ready

## Practical Note

เอกสารชุดนี้ตั้งใจให้ใช้งานได้ทั้ง:
- สำหรับคนใหม่เริ่มโครงการจากศูนย์
- สำหรับต่อยอดฟีเจอร์ใหม่
- สำหรับแยก module ของ Omnichannel และ Workforce Management อย่างชัดเจน
