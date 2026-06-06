import { createServer } from "@modelcontextprotocol/server";
import { SupabaseClient, createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://cdexwhsaycfmugseorpq.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkZXh3aHNheWNmbXVnc2VvcnBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2ODMxNzksImV4cCI6MjA3MzI1OTE3OX0.vFOi_QVPE0ZXsr1CbEPny2oyfgkg02PSLuXAKHdMVVw' // use Service Role for admin ops
);

const server = createServer({
  name: "supabase",
  description: "MCP server for Supabase database queries",
  tools: {
    async query({ input }) {
      const { sql, params } = input;
      const { data, error } = await supabase.rpc("exec_sql", { sql, params });
      if (error) throw new Error(error.message);
      return { data };
    },
  },
});

server.start();
