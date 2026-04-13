async function test() {
  const url = 'https://cdn.jsdelivr.net/npm/retroemu@0.3.0/cores/prosystem_libretro.js';
  try {
    const res = await fetch(url);
    const text = await res.text();
    console.log('Length:', text.length);
    console.log('Last 500 chars:', text.substring(text.length - 500));
    
    // Test the regex
    let fixedJs = text.replace(/export\s*default\s*([a-zA-Z0-9_]+);/g, 'window.$1 = $1;');
    fixedJs = fixedJs.replace(/export\s*\{\s*([a-zA-Z0-9_]+)\s*as\s*default\s*\};/g, 'window.$1 = $1;');
    fixedJs = fixedJs.replace(/import\.meta\.url/g, `"${url}"`);
    fixedJs = fixedJs.replace(/const\s*\{\s*createRequire\s*\}\s*=\s*await\s*import\(['"]module['"]\);/g, 'const createRequire = () => ({});');
    
    console.log('Fixed Last 500 chars:', fixedJs.substring(fixedJs.length - 500));
  } catch (e) {
    console.error(e);
  }
}
test();
