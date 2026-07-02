// Ensures a Resend Audience named "Kulworks Newsletter" exists; prints its id.
// Idempotent — reuses the existing one. Put the id in .env.local as RESEND_AUDIENCE_ID.
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const NAME = "Kulworks Newsletter";

const list = await resend.audiences.list();
let audience = list.data?.data?.find((a) => a.name === NAME);

if (!audience) {
  const { data, error } = await resend.audiences.create({ name: NAME });
  if (error) {
    console.error("❌ create failed:", JSON.stringify(error));
    process.exit(1);
  }
  audience = data;
  console.log("• created audience");
} else {
  console.log("• reusing existing audience");
}

console.log(`RESEND_AUDIENCE_ID=${audience.id}`);
