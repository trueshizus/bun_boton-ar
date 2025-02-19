import { eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import type { FC } from "hono/jsx";
import db from "./db";
import {
  commentsTable,
  modqueueItemsTable,
  trackedSubredditsTable,
} from "./db/schema";
import App, { type AppState } from "./app/Dashboard";

const app = new Hono();

const Layout: FC = (props) => {
  return (
    <html>
      <head>
        <title>BotonAr Dashboard</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
            document.addEventListener('DOMContentLoaded', () => {
              const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
              const ws = new WebSocket(\`\${protocol}//\${window.location.host}/ws\`);
              
              ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.current_time) {
                  document.getElementById('time-display').textContent = data.current_time;
                } else if (data.type === 'subreddit_added') {
                  // Handle the new subreddit event
                  console.log('New subreddit added:', data.subreddit);
                }
              };

              ws.onerror = (error) => {
                console.error('WebSocket error:', error);
              };

              ws.onclose = () => {
                console.log('WebSocket connection closed');
              };
            });
          `,
          }}
        />
      </head>
      <body class="bg-gray-100">
        <div class="container mx-auto px-4 py-8">{props.children}</div>
      </body>
    </html>
  );
};

app.get("/", async (c) => {
  // Get all tracked subreddits
  const subreddits = await db.select().from(trackedSubredditsTable);

  // Get modqueue counts and recent comments for each subreddit
  const dashboardData: AppState = {
    subreddits: await Promise.all(
      subreddits.map(async (sub) => {
        const [modqueueCount] = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(modqueueItemsTable)
          .where(eq(modqueueItemsTable.subreddit, sub.subreddit));

        const [commentsCount] = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(commentsTable)
          .where(eq(commentsTable.subreddit, sub.subreddit));

        return {
          name: sub.subreddit,
          isActive: sub.is_active,
          modqueueCount: Number(modqueueCount.count),
          recentComments: Number(commentsCount.count),
        };
      })
    ),
    totalModqueueItems: 0,
    totalComments: 0,
    queueStats: {
      pendingTasks: 0, // Replace with actual queue stats
      processingTasks: 0,
      lastProcessed: new Date().toISOString(),
    },
    scheduledTasks: [
      {
        name: "Modqueue Sync",
        nextRun: new Date(Date.now() + 300000).toISOString(), // +5 minutes
        lastRun: new Date().toISOString(),
        status: "active",
      },
      {
        name: "Comment Cleanup",
        nextRun: new Date(Date.now() + 3600000).toISOString(), // +1 hour
        lastRun: new Date().toISOString(),
        status: "completed",
      },
      // Add more scheduled tasks as needed
    ],
    workerStatus: {
      isRunning: true, // Replace with actual worker status
      queueSize: 42, // Replace with actual queue size
      lastStarted: new Date().toISOString(),
    },
  };

  // Calculate totals
  dashboardData.totalModqueueItems = dashboardData.subreddits.reduce(
    (acc, sub) => acc + sub.modqueueCount,
    0
  );
  dashboardData.totalComments = dashboardData.subreddits.reduce(
    (acc, sub) => acc + sub.recentComments,
    0
  );

  return c.html(
    <Layout>
      <App data={dashboardData} />
    </Layout>
  );
});

export default app;
