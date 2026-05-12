const PASSWORD = "qaz741"

function html(content) {

  return new Response(content, {

    headers: {
      "Content-Type": "text/html;charset=UTF-8"
    }

  })
}

export default {

  async fetch(request, env) {

    const url = new URL(request.url)

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
      `)
    }

    // 退出登录
    if (url.pathname === "/logout") {

      return new Response(null, {

        status: 302,

        headers: {

          "Location": "/login",

          "Set-Cookie":
            "rp_auth=; Path=/; Max-Age=0"

        }

      })
    }

    // 未登录
    if (!loggedIn) {

      return Response.redirect(
        `${url.origin}/login`,
        302
      )
    }

    // 已登录后读取静态资源
    const response =
      await env.ASSETS.fetch(request)

    return response

  }

}
