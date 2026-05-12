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

    // 1. 登录与退出逻辑
    if (url.pathname === "/login") {
      return html(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>RP-Hub Login</title><style>body{background:#111;color:white;display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;}.box{width:320px;background:#222;padding:30px;border-radius:12px;}input{width:100%;padding:12px;border:none;border-radius:8px;box-sizing:border-box;}button{width:100%;padding:12px;margin-top:15px;border:none;border-radius:8px;background:#5865f2;color:white;}</style></head><body><div class="box"><h2>RP-Hub 登录</h2><form method="POST" action="/auth"><input type="password" name="password" placeholder="输入密码" required><button type="submit">登录</button></form></div></body></html>`);
    }

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

    if (url.pathname === "/logout") {
      return new Response(null, {
        status: 302,
        headers: { "Location": "/login", "Set-Cookie": "rp_auth=; Path=/; Max-Age=0" }
      });
    }

    // 2. 鉴权拦截 (API 或 静态资源)
    if (!loggedIn) {
      if (url.pathname.startsWith("/api/")) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
      return Response.redirect(`${url.origin}/login`, 302);
    }

    // 3. 数据接口 API
    // --- KV：配置 ---
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

    // --- D1：角色 ---
    if (url.pathname === "/api/characters") {
      if (request.method === "GET") {
        const { results } = await env.RP_DB.prepare("SELECT data FROM characters ORDER BY updated_at DESC").all();
        const characters = results.map(row => JSON.parse(row.data));
        return Response.json(characters);
      }
      if (request.method === "POST") {
        const characters = await request.json();
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

    // --- R2：文件上传 ---
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

    // --- R2：读取文件 ---
    if (url.pathname.startsWith("/api/image/")) {
      const key = url.pathname.replace("/api/image/", "");
      const object = await env.RP_R2.get(key);
      if (!object) return new Response("Not Found", { status: 404 });
      const headers = new Headers();
      object.writeHttpMetadata(headers);
      return new Response(object.body, { headers });
    }

    // 4. 默认返回前端静态文件
    return await env.ASSETS.fetch(request);
  }
};
