const PASSWORD = "qaz741"

function html(content) {
  return new Response(content, {
    headers: {
      "Content-Type": "text/html;charset=UTF-8"
    }
  })
}

function redirect(url) {
  return Response.redirect(url, 302)
}

export default {

  async fetch(request, env) {

    const url = new URL(request.url)

    // 读取 Cookie
    const cookie =
      request.headers.get("Cookie") || ""

    const loggedIn =
      cookie.includes("rp_auth=1")

    // 登录页
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

  margin-top:15px;

  padding:12px;

  border:none;

  border-radius:8px;

  background:#5865f2;

  color:white;

  cursor:pointer;
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
placeholder="输入访问密码"
required
>

<button type="submit">
登录
</button>

</form>

</div>

</body>
</html>
      `)
    }

    // 登录接口
    if (
      url.pathname === "/auth" &&
      request.method === "POST"
    ) {

      const form =
        await request.formData()

      const password =
        form.get("password")

      // 密码正确
      if (password === PASSWORD) {

        return new Response(null, {

          status: 302,

          headers: {

            "Location": "/",

            "Set-Cookie":
              "rp_auth=1; Path=/; HttpOnly; Secure; SameSite=Strict"

          }

        })
      }

      return html(`
        <h1>密码错误</h1>
        <a href="/login">返回登录</a>
      `)
    }

    // 未登录
    if (!loggedIn) {

      return redirect(
        `${url.origin}/login`
      )
    }

    // 已登录后返回静态资源
    return env.ASSETS.fetch(request)

  }

}
