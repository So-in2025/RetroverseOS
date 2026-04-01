
import fetch from 'node-fetch';

async function testBios() {
  const url = 'https://raw.githubusercontent.com/archtaurus/RetroPieBIOS/master/BIOS/disksys.rom';
  console.log(`Testing BIOS URL: ${url}`);
  try {
    const res = await fetch(url);
    console.log(`Status: ${res.status} ${res.statusText}`);
    if (res.ok) {
      const buffer = await res.arrayBuffer();
      console.log(`Size: ${buffer.byteLength} bytes`);
      const view = new Uint8Array(buffer);
      console.log(`Magic: ${view[0].toString(16)} ${view[1].toString(16)} ${view[2].toString(16)} ${view[3].toString(16)}`);
    }
  } catch (e) {
    console.error('Error:', e);
  }
}

testBios();
