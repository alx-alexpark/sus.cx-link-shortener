import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

function generateShortCode(length: number = 6): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function GET(req: NextRequest) {
  try {
    // Get session
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch user's links
    const result = await pool.query(
      `SELECT id, short_code, original_url, clicks, created_at
       FROM links
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [session.user.id]
    );

    return NextResponse.json({
      links: result.rows.map((row: any) => ({
        id: row.id,
        shortCode: row.short_code,
        originalUrl: row.original_url,
        clicks: row.clicks,
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    console.error("Error fetching links:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Get session
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { url, customSlug } = body;

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    // Get slack_id from account table
    const accountResult = await pool.query(
      `SELECT a.id, a."accountId" 
       FROM account a 
       WHERE a."userId" = $1 AND a."providerId" = 'hca' 
       LIMIT 1`,
      [session.user.id]
    );

    const slackId = accountResult.rows[0]?.accountId || null;

    let shortCode = customSlug;

    // If custom slug provided, check if it's available
    if (customSlug) {
      if (customSlug.length < 3) {
        return NextResponse.json(
          { error: "Custom slug must be at least 3 characters" },
          { status: 400 }
        );
      }

      // Validate custom slug format (only alphanumeric, hyphens, and underscores)
      if (!/^[a-z0-9_-]+$/i.test(customSlug)) {
        return NextResponse.json(
          { error: "Custom slug can only contain letters, numbers, hyphens, and underscores" },
          { status: 400 }
        );
      }

      const existing = await pool.query(
        "SELECT id FROM links WHERE short_code = $1",
        [customSlug]
      );

      if (existing.rows.length > 0) {
        return NextResponse.json(
          { error: "This custom slug is already taken" },
          { status: 400 }
        );
      }
    } else {
      // Generate random short code
      let attempts = 0;
      while (attempts < 10) {
        shortCode = generateShortCode();
        const existing = await pool.query(
          "SELECT id FROM links WHERE short_code = $1",
          [shortCode]
        );

        if (existing.rows.length === 0) {
          break;
        }
        attempts++;
      }

      if (attempts === 10) {
        return NextResponse.json(
          { error: "Failed to generate unique short code" },
          { status: 500 }
        );
      }
    }

    // Insert into database with slack_id
    const result = await pool.query(
      `INSERT INTO links (short_code, original_url, user_id, slack_id, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id, short_code, original_url, created_at`,
      [shortCode, url, session.user.id, slackId]
    );

    return NextResponse.json({
      id: result.rows[0].id,
      shortCode: result.rows[0].short_code,
      originalUrl: result.rows[0].original_url,
      createdAt: result.rows[0].created_at,
    });
  } catch (error) {
    console.error("Error creating short link:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
