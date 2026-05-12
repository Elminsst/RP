const PASSWORD = "qaz741"

function getCookie(request, name) {
  const cookie = request.headers.get("Cookie") || ""

  const match = cookie.match(
    new RegExp(`(^| )${name}=([^;]+)`)
  )

  return match ? match[2] : null
}

export default {
  async fetch(request, env) {

    const url = new URL(request.url)

    // 登录接口
    if (
      request.method === "POST" &&
      url.pathname === "/login"
    ) {

      const form = await request.formData()

      const password = form.get("password")

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

      return new Response(`
        <h1>密码错误</h1>
        <a href="/login">返回</a>
      `, {
        headers: {
          "Content-Type": "text/html;charset=UTF-8"
        }
      })
    }

    // 登录页面
    if (url.pathname === "/login") {

      return new Response(`
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
  background:#222;
  padding:30px;
  border-radius:12px;
  width:300px;
}

input{
  width:100%;
  padding:12px;
  margin-top:10px;
  border:none;
  border-radius:8px;
}

button{
  width:100%;
  padding:12px;
  margin-top:15px;
  background:#5865f2;
  color:white;
  border:none;
  border-radius:8px;
  cursor:pointer;
}
</style>
</head>

<body>

<div class="box">
  <h2>RP-Hub Login</h2>

  <form method="POST" action="/login">

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
      `, {
        headers: {
          "Content-Type": "text/html;charset=UTF-8"
        }
      })
    }

    // 检查登录状态
    const auth = getCookie(request, "rp_auth")

    // 未登录
    if (auth !== "1") {

      return Response.redirect(
        `${url.origin}/login`,
        302
      )
    }

    // 已登录
    return env.ASSETS.fetch(request)
  }
}
