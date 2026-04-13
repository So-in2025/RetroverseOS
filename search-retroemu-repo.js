async function test() {
  const url = 'https://api.github.com/search/repositories?q=retroemu';
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log('Repos:', data.items.map(r => r.full_name));
  } catch (e) {
    console.error(e);
  }
}
test();
