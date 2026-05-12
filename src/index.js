const PASSWORD = "qaz741";

function html(content) {
  return new Response(content, {
    headers: {
      "Content-Type": "text/html;charset=UTF-8"
    }
  });
}

export default {

  async fetch(request, env) {

    const url = new URL(request.url);

    const cookie =
      request.headers.get("Cookie") || "";

    const loggedIn =
      cookie.includes("rp_auth=1");

    // =========================================
    // KV 测试接口
    // =========================================
    if (url.pathname === "/api/kv/test") {

      await env.RP_KV.put(
        "rp_test",
        "kv_working"
      );

      const value =
        await env.RP_KV.get("rp_test");

      return Response.json({
        ok: true,
        value
      });
    }

    // =========================================
    // D1 测试接口
    // =========================================
    if (url.pathname === "/api/db/test") {

      const result =
        await env.RP_DB
          .prepare("SELECT 1 as ok")
          .first();

      return Response.json(result);
    }

    // =========================================
    // 上传图片到 R2
    // =========================================
    if (
      url.pathname === "/api/upload" &&
      request.method === "POST"
    ) {

      // 未登录禁止上传
      if (!loggedIn) {

        return Response.json({
          error: "Unauthorized"
        }, {
          status: 401
        });
      }

      const formData =
        await request.formData();

      const file =
        formData.get("file");

      if (!file) {

        return Response.json({
          error: "No file uploaded"
        }, {
          status: 400
        });
      }

      const fileName =
        `uploads/${Date.now()}-${file.name}`;

      await env.RP_R2.put(
        fileName,
        await file.arrayBuffer(),
        {
          httpMetadata: {
            contentType: file.type
          }
        }
      );

      // 可选：记录到 D1
      try {

        await env.RP_DB.prepare(`
          INSERT INTO images (
            type,
            prompt,
            r2_key,
            created_at
          )
          VALUES (?, ?, ?, ?)
        `)
          .bind(
            "upload",
            "",
            fileName,
            new Date().toISOString()
          )
          .run();

      } catch (e) {
        console.log(e);
      }

      return Response.json({
        ok: true,
        key: fileName,
        url: `/api/image/${fileName}`
      });
    }

    // =========================================
    // 从 R2 读取图片
    // =========================================
    if (
      url.pathname.startsWith("/api/image/")
    ) {

      // 未登录禁止读取
      if (!loggedIn) {

        return Response.redirect(
          `${url.origin}/login`,
          302
        );
      }

      const key =
        url.pathname.replace(
          "/api/image/",
          ""
        );

      const object =
        await env.RP_R2.get(key);

      if (!object) {

        return new Response(
          "Image Not Found",
          { status: 404 }
        );
      }

      return new Response(
        object.body,
        {
          headers: {
            "Content-Type":
              object.httpMetadata?.contentType ||
              "image/png"
          }
        }
      );
    }

    // =========================================
    // 登录页
    // =========================================
    if (url.pathname === "/login") {

      return html(`
<!DOCTYPE html>
<html>

<head>

<meta charset="UTF-8">
<title>RP-Hub Login</title>

<style>

body{
  background:#111;
  color:white;
  display:flex;
  justify-content:center;
  align-items:center;
  height:100vh;
  font-family:sans-serif;
}

.box{
  width:320px;
  background:#222;
  padding:30px;
  border-radius:12px;
}

input{
  width:100%;
  padding:12px;
  border:none;
  border-radius:8px;
  box-sizing:border-box;
}

button{
  width:100%;
  padding:12px;
  margin-top:15px;
  border:none;
  border-radius:8px;
  background:#5865f2;
  color:white;
}

</style>

</head>

<body>

<div class="box">

<h2>RP-Hub 登录</h2>

<form method="POST" action="/auth">

<input
type="password"
name="password"
placeholder="输入密码"
required
>

<button type="submit">
登录
</button>

</form>

</div>

</body>
</html>
      `);
    }

    // =========================================
    // 登录接口
    // =========================================
    if (
      url.pathname === "/auth" &&
      request.method === "POST"
    ) {

      const form =
        await request.formData();

      const password =
        form.get("password");

      if (password === PASSWORD) {

        return new Response(
          null,
          {
            status: 302,

            headers: {

              "Location": "/",

              "Set-Cookie":
                "rp_auth=1; Path=/; HttpOnly; Secure; SameSite=Strict"
            }
          }
        );
      }

      return html(`
        <h1>密码错误</h1>
      `);
    }

    // =========================================
    // 退出登录
    // =========================================
    if (url.pathname === "/logout") {

      return new Response(
        null,
        {
          status: 302,

          headers: {

            "Location": "/login",

            "Set-Cookie":
              "rp_auth=; Path=/; Max-Age=0"
          }
        }
      );
    }

    // =========================================
    // 未登录拦截
    // =========================================
    if (!loggedIn) {

      return Response.redirect(
        `${url.origin}/login`,
        302
      );
    }

    // =========================================
    // 已登录后读取静态资源
    // =========================================
    const response =
      await env.ASSETS.fetch(request);

    return response;
  }
}
