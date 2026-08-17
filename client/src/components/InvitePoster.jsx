import { useEffect, useRef, useState } from 'react';
import { Toast } from 'react-vant';
import QRCode from 'qrcode';

const POSTER_WIDTH = 750;
const POSTER_HEIGHT = 1200;

export default function InvitePoster({ inviteCode, nickname = '酒店商机伙伴' }) {
  const canvasRef = useRef(null);
  const [posterUrl, setPosterUrl] = useState('');

  const drawPoster = async () => {
    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      canvas.width = POSTER_WIDTH;
      canvas.height = POSTER_HEIGHT;

      const bg = ctx.createLinearGradient(0, 0, POSTER_WIDTH, POSTER_HEIGHT);
      bg.addColorStop(0, '#1b7af2');
      bg.addColorStop(1, '#0d5fc7');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, POSTER_WIDTH, POSTER_HEIGHT);

      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.beginPath();
      ctx.arc(620, 200, 220, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(80, 980, 160, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 72px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('酒店商机互助平台', POSTER_WIDTH / 2, 260);

      ctx.font = '32px sans-serif';
      ctx.fillText('真实商机信息 · 分享赚积分', POSTER_WIDTH / 2, 330);

      ctx.fillStyle = '#ffffff';
      ctx.font = '40px sans-serif';
      ctx.fillText(`邀请人：${nickname}`, POSTER_WIDTH / 2, 480);

      ctx.font = '28px sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillText('扫码或复制邀请码，一起加入', POSTER_WIDTH / 2, 540);

      if (inviteCode) {
        const qrCanvas = document.createElement('canvas');
        await QRCode.toCanvas(qrCanvas, inviteCode, { width: 360, margin: 1 });
        ctx.drawImage(qrCanvas, (POSTER_WIDTH - 360) / 2, 620, 360, 360);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 44px monospace';
        ctx.fillText(inviteCode, POSTER_WIDTH / 2, 1090);

        ctx.font = '26px sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.fillText('长按保存图片分享给好友', POSTER_WIDTH / 2, 1140);
      }

      setPosterUrl(canvas.toDataURL('image/png'));
    } catch (e) {
      Toast.fail('海报生成失败');
    }
  };

  useEffect(() => {
    drawPoster();
  }, [inviteCode, nickname]);

  const handleSave = async () => {
    if (!posterUrl) return;
    try {
      const blob = await (await fetch(posterUrl)).blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `邀请海报-${inviteCode}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      Toast.success('海报已保存');
    } catch (e) {
      Toast.fail('保存失败，请长按图片保存');
    }
  };

  return (
    <div className="poster-box">
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      {posterUrl && (
        <div className="poster-preview">
          <img src={posterUrl} alt="邀请海报" onClick={handleSave} />
          <p className="poster-tip">点击图片即可保存</p>
        </div>
      )}
    </div>
  );
}
