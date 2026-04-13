async function test() {
  const url = 'https://data.jsdelivr.net/v1/package/npm/nostalgist@0.21.0';
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log('Files:', JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(e);
  }
}
test();
