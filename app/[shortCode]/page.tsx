import { Pool } from "pg";
import { redirect, notFound } from "next/navigation";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

export async function generateMetadata({ params }: { params: Promise<{ shortCode: string }> }) {
  return {
    title: "Redirecting... | sus.cx",
  };
}

export default async function RedirectPage({ params }: { params: Promise<{ shortCode: string }> }) {
  const { shortCode } = await params;

  console.log("Looking up shortCode:", shortCode);

  const result = await pool.query(
    `UPDATE links 
     SET clicks = clicks + 1, last_clicked_at = NOW()
     WHERE short_code = $1
     RETURNING original_url`,
    [shortCode]
  );

  console.log("Query result:", result.rows);

  if (result.rows.length === 0) {
    console.log("No link found for shortCode:", shortCode);
    notFound();
  }

  const originalUrl = result.rows[0].original_url;
  console.log("Redirecting to:", originalUrl);
  redirect(originalUrl);
}
