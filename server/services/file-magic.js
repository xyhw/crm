/**
 * 文件魔数校验工具：校验文件真实内容与声明格式一致，
 * 防止伪造扩展名/mimetype 上传非预期文件（存储型攻击面收敛）。
 */

// 扩展名 -> 允许的魔数特征（读文件头字节）
const MAGIC_BY_EXT = {
  '.jpg': [[0xff, 0xd8, 0xff]],
  '.jpeg': [[0xff, 0xd8, 0xff]],
  '.png': [[0x89, 0x50, 0x4e, 0x47]],
  '.gif': [[0x47, 0x49, 0x46, 0x38]], // GIF8
  '.webp': [[0x52, 0x49, 0x46, 0x46, null, null, null, null, 0x57, 0x45, 0x42, 0x50]], // RIFF....WEBP
  '.pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
  '.doc': [[0xd0, 0xcf, 0x11, 0xe0]], // OLE2
  '.xls': [[0xd0, 0xcf, 0x11, 0xe0]], // OLE2
  '.docx': [[0x50, 0x4b, 0x03, 0x04]], // ZIP 容器（OOXML）
  '.xlsx': [[0x50, 0x4b, 0x03, 0x04]], // ZIP 容器（OOXML）
};

function matches(head, pattern) {
  for (let i = 0; i < pattern.length; i += 1) {
    const expected = pattern[i];
    if (expected !== null && head[i] !== expected) return false;
  }
  return true;
}

/**
 * 校验文件头是否符合该扩展名的魔数特征。
 * @param {Buffer} buf 文件开头字节（建议读取至少 12 字节）
 * @param {string} ext 小写扩展名（含点）
 * @returns {boolean}
 */
export function validateFileMagic(buf, ext) {
  const patterns = MAGIC_BY_EXT[ext];
  if (!patterns) return false; // 未知扩展名
  if (!buf || buf.length < 4) return false;
  return patterns.some((p) => matches(buf, p));
}