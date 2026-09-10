(()=>{
// Local format checks only. OpenAI still decides whether a key is valid.
// Never echo user input in errors or logs.
function parseKeyInput(value){
  const problem=(code,error,detail)=>({problem:{code,error,detail}});
  if(typeof value!=='string'||!value.trim())return problem('key_empty','请先复制并粘贴密钥。','Copy your secret key, then paste it into this box.');
  let key=value.trim();
  const wrappers=[['"','"'],["'","'"],['`','`'],['“','”'],['‘','’']];
  for(const [start,end] of wrappers)if(key.startsWith(start)&&key.endsWith(end)){key=key.slice(1,-1).trim();break;}
  if((key.match(/(?:^|\s)sk-/g)||[]).length>1)return problem('key_multiple','这里有多个密钥，请只粘贴一个。','More than one key was pasted. Use Copy beside a single secret key.');
  if(/[•*…]|\.{3}/.test(key))return problem('key_hidden','这只是隐藏后的密钥，无法连接。请复制完整代码。','This is a hidden or shortened key. Copy the full code from the Save your key window.');
  if(!key.startsWith('sk-'))return problem('key_code_needed','请复制以 sk- 开头的长代码，不是 Pawlish 这个名称。','Use Copy beside the long code starting with sk- in OpenAI’s Save your key window. Pawlish is only the name.');
  // Copying a wrapped code can add spaces or invisible characters. Removing
  // these cannot introduce characters into a key or skip OpenAI authentication.
  key=key.replace(/[\s\u200B-\u200D\u2060\uFEFF]/g,'').replace(/\\([_-])/g,'$1');
  if(key.length>1027)return problem('key_too_long','粘贴的内容太长，请只复制密钥。','Too much text was pasted. Copy only the secret code.');
  if(!/^sk-[A-Za-z0-9_-]+$/.test(key))return problem('key_extra_text','密钥中有其他文字或符号，请使用 OpenAI 的复制按钮。','Extra text or symbols were pasted. Use OpenAI’s Copy button beside the secret code.');
  if(key.length<19)return problem('key_incomplete','密钥没有复制完整，请使用代码旁边的复制按钮。','The code is incomplete. Use Copy beside the full secret key.');
  return {key};
}

globalThis.PawlishKeyInput={parseKeyInput};})();
