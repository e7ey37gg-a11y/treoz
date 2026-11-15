require('dotenv').config();
const express = require('express');
const axios = require('axios');
const app = express();

const {
  CLIENT_ID,
  CLIENT_SECRET,
  BOT_TOKEN,
  GUILD_ID,
  REDIRECT_URI,
  PORT = 3000
} = process.env;

// Route trang chủ kiểm tra server đang hoạt động
app.get('/', (req, res) => {
  res.send('<h3>Discord OAuth2 Server đang hoạt động bình thường!</h3>');
});

// Route nhận mã xác thực (code) từ Discord trả về sau khi người dùng bấm Phê duyệt
app.get('/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.status(400).send('Thiếu mã xác thực (code) từ Discord.');
  }

  try {
    // Bước 1: Đổi mã code lấy access_token của người dùng
    const tokenResponse = await axios.post(
      'https://discord.com/api/oauth2/token',
      new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const accessToken = tokenResponse.data.access_token;

    // Bước 2: Lấy thông tin cá nhân (User ID, Username) của họ
    const userResponse = await axios.get('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const userId = userResponse.data.id;
    const username = userResponse.data.username;

    // Bước 3: Dùng Bot Token để đưa tài khoản đó vào server đích (guilds.join)
    await axios.put(
      `https://discord.com/api/guilds/${GUILD_ID}/members/${userId}`,
      { access_token: accessToken },
      {
        headers: {
          Authorization: `Bot ${BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    res.send(`
      <h2 style="color: green;">Xác thực thành công!</h2>
      <p>Tài khoản <b>${username}</b> đã được liên kết và tự động thêm vào máy chủ thành công.</p>
    `);
  } catch (error) {
    console.error('Lỗi OAuth2:', error.response?.data || error.message);
    res.status(500).send('Có lỗi xảy ra khi xử lý cấp quyền hoặc thêm vào máy chủ.');
  }
});

// Khởi động server
app.listen(PORT, () => {
  console.log(`Server đang chạy tại cổng ${PORT}`);
});
