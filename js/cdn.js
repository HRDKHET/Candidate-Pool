// Third-party libraries, each pinned to an exact version and locked with a
// Subresource Integrity hash: if the CDN ever serves a different file, the
// browser refuses to run it. To upgrade a library, change the URL and replace
// its hash (sha384, base64) with the hash of the new file.
const LIBS = {
  anime: {
    url: 'https://cdn.jsdelivr.net/npm/animejs@4.0.2/lib/anime.umd.min.js',
    integrity: 'sha384-UWVZz/cb/AFYOBgPI/ZQT0/UptEMus9oo/nfqWqOfGTpnP/P9N/KrN/5l77vw/BS',
    global: 'anime'
  },
  supabase: {
    url: 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.3/dist/umd/supabase.js',
    integrity: 'sha384-BWcjm9OdFth9TbhCxZPdm+gAOUMAzQy9nmTs12ioXdCcbVnJaPMn+fMUoQCLt60R',
    global: 'supabase'
  },
  xlsx: {
    url: 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
    integrity: 'sha384-vtjasyidUo0kW94K5MXDXntzOJpQgBKXmE7e2Ga4LG0skTTLeBi97eFAXsqewJjw',
    global: 'XLSX'
  }
};

const loading = {};

// Resolves with the library's global object; rejects if it fails to load or
// its hash does not match.
export function loadLib(name) {
  const lib = LIBS[name];
  if (window[lib.global]) return Promise.resolve(window[lib.global]);
  if (!loading[name]) {
    loading[name] = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = lib.url;
      s.integrity = lib.integrity;
      s.crossOrigin = 'anonymous';
      s.referrerPolicy = 'no-referrer';
      s.onload = () => (window[lib.global] ? resolve(window[lib.global]) : reject(new Error(name + ' did not load')));
      s.onerror = () => { delete loading[name]; s.remove(); reject(new Error(name + ' failed to load')); };
      document.head.appendChild(s);
    });
  }
  return loading[name];
}
