const PASSWORD = "qaz741";

// 辅助函数：渲染 HTML
function html(content) {
  return new Response(content, {
    headers: { "Content-Type": "text/html;charset=UTF-8" }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cookie = request.headers.get("Cookie") || "";
    const loggedIn = cookie.includes("rp_auth=1");

    // =========================================
    // 1. 登录与身份验证逻辑
    // =========================================
    
    // 登录页
    if (url.pathname === "/login") {
      return html(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>RP-Hub Login</title><style>body{background:#111;color:white;display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;}.box{width:320px;background:#222;padding:30px;border-radius:12px;}input{width:100%;padding:12px;border:none;border-radius:8px;box-sizing:border-box;}button{width:100%;padding:12px;margin-top:15px;border:none;border-radius:8px;background:#5865f2;color:white;}</style></head><body><div class="box"><h2>RP-Hub 登录</h2><form method="POST" action="/auth"><input type="password" name="password" placeholder="输入密码" required><button type="submit">登录</button></form></div></body></html>`);
    }

    // 登录验证
    if (url.pathname === "/auth" && request.method === "POST") {
      const form = await request.formData();
      if (form.get("password") === PASSWORD) {
        return new Response(null, {
          status: 302,
          headers: {
            "Location": "/",
            "Set-Cookie": "rp_auth=1; Path=/; HttpOnly; Secure; SameSite=Strict"
          }
        });
      }
      return html(`<h1>密码错误</h1><a href="/login">返回</a>`);
    }

    // 退出登录
    if (url.pathname === "/logout") {
      return new Response(null, {
        status: 302,
        headers: { "Location": "/login", "Set-Cookie": "rp_auth=; Path=/; Max-Age=0" }
      });
    }

    // =========================================
    // 2. 数据层 API (需要登录权限)
    // =========================================
    if (!loggedIn && url.pathname.startsWith("/api/")) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // --- KV 层：存储全局配置与设置 ---
    if (url.pathname === "/api/config") {
      if (request.method === "GET") {
        const config = await env.RP_KV.get("user_config", "json");
        return Response.json(config || { settings: {}, currentRoleIndex: 0 });
      }
      if (request.method === "POST") {
        const body = await request.json();
        await env.RP_KV.put("user_config", JSON.stringify(body));
        return Response.json({ ok: true });
      }
    }

    // --- D1 层：存储结构化角色数据 ---
    if (url.pathname === "/api/characters") {
      if (request.method === "GET") {
        const { results } = await env.RP_DB.prepare(
          "SELECT id, name, data FROM characters ORDER BY updated_at DESC"
        ).all();
        // 将 D1 存储的字符串转换回 JSON 给前端
        const characters = results.map(row => JSON.parse(row.data));
        return Response.json(characters);
      }
      if (request.method === "POST") {
        const characters = await request.json(); // 前端传来的角色数组
        // 简单实现：事务性覆盖更新（建议实际场景根据 ID 单个更新）
        const statements = [env.RP_DB.prepare("DELETE FROM characters")];
        for (const char of characters) {
          statements.push(
            env.RP_DB.prepare("INSERT INTO characters (id, name, data) VALUES (?, ?, ?)")
              .bind(char.id, char.name, JSON.stringify(char))
          );
        }
        await env.RP_DB.batch(statements);
        return Response.json({ ok: true });
      }
    }

    // --- R2 层：二进制文件 (图片) 上传与获取 ---
    if (url.pathname === "/api/upload" && request.method === "POST") {
      const formData = await request.formData();
      const file = formData.get("file");
      if (!file) return Response.json({ error: "No file" }, { status: 400 });

      const fileName = `uploads/${Date.now()}-${file.name}`;
      await env.RP_R2.put(fileName, await file.arrayBuffer(), {
        httpMetadata: { contentType: file.type }
      });

      return Response.json({ ok: true, url: `/api/image/${fileName}` });
    }
