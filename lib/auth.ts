import { betterAuth } from "better-auth";
import { genericOAuth } from "better-auth/plugins";
import { Pool } from "pg";

export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  }),
  plugins: [
    genericOAuth({
      config: [
        {
          providerId: "hca-prod",
          clientId: process.env.OAUTH_CLIENT_ID as string,
          clientSecret: process.env.OAUTH_CLIENT_SECRET as string,
          authorizationUrl: "https://account.hackclub.com/oauth/authorize",
          tokenUrl: "https://account.hackclub.com/oauth/token",
          userInfoUrl: "https://account.hackclub.com/api/v1/me",
          scopes: ["email", "name", "slack_id"],
          mapProfileToUser: (profile) => {
            return {
              id: profile.identity?.id || profile.id,
              email: profile.identity?.primary_email || profile.primary_email,
              name: profile.identity ? `${profile.identity.first_name} ${profile.identity.last_name}` : `${profile.first_name} ${profile.last_name}`,
              image: undefined,
              emailVerified: true,
            };
          },
        },
        // Add more providers as needed
      ],
    }),
  ],
});
