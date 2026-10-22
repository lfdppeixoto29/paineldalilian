const local = (() => { try { return require('./config.local'); } catch (e) { return {}; } })();
const apiKey = process.env.RENDER_API_KEY || local.RENDER_API_KEY;

async function testRenderAPI() {
    try {
        const response = await fetch('https://api.render.com/v1/owners', {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json'
            }
        });
        const data = await response.json();
        console.log("Render Owners Response:", JSON.stringify(data, null, 2));
    } catch (err) {
        console.error("Erro ao conectar com a API do Render:", err);
    }
}

testRenderAPI();
