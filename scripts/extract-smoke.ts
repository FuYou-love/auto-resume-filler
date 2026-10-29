import { strToU8, zipSync } from "fflate";
import { fileToText } from "../src/resume/extract-text";

async function main(): Promise<void> {
  const documentXml = `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>李小美</w:t></w:r></w:p>
    <w:p><w:r><w:t>手机：13900001111</w:t></w:r><w:r><w:t>邮箱：limei@example.com</w:t></w:r></w:p>
    <w:p><w:r><w:t>教育经历</w:t></w:r></w:p>
    <w:p><w:r><w:t>复旦大学 软件工程 硕士 2021.09 - 2024.06</w:t></w:r></w:p>
  </w:body>
</w:document>`;

  const zipped = zipSync({
    "[Content_Types].xml": strToU8(`<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>`),
    "word/document.xml": strToU8(documentXml)
  });

  const file = new File([zipped], "李小美-简历.docx");
  const text = await fileToText(file);
  console.log(text);

  const required = ["李小美", "13900001111", "limei@example.com", "复旦大学", "软件工程"];
  const missing = required.filter((value) => !text.includes(value));
  if (missing.length) {
    console.error("FAILED: DOCX 缺少 " + missing.join("、"));
    process.exit(1);
  }
  console.log("PASS: DOCX 文本提取测试通过");
}

void main();
