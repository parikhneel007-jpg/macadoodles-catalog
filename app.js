/* global React, ReactDOM, htm */
const html = htm.bind(React.createElement)
const { useEffect, useMemo, useState } = React

const STORAGE_KEY = 'liquor_store_products_v1'
const currency = (n) => isFinite(n) ? Number(n).toLocaleString(undefined, { style: 'currency', currency: 'USD' }) : '—'
const toNumber = (v) => { if (v==null) return NaN; const num = typeof v==='number'? v: parseFloat(String(v).replace(/[^0-9.\-]/g,'')); return isNaN(num)? NaN : num }
const guessCategory = (name) => {
  const n = (name||'').toLowerCase()
  if (/(cabernet|merlot|pinot|chardonnay|sauvignon|malbec|riesling|wine)/.test(n)) return 'Wine'
  if (/(whiskey|whisky|bourbon|rye|scotch)/.test(n)) return 'Whiskey'
  if (/(tequila|mezcal)/.test(n)) return 'Tequila/Mezcal'
  if (/vodka/.test(n)) return 'Vodka'
  if (/gin/.test(n)) return 'Gin'
  if (/rum/.test(n)) return 'Rum'
  if (/(brandy|cognac|armagnac)/.test(n)) return 'Brandy'
  if (/(beer|lager|ipa|stout|ale|porter|pils)/.test(n)) return 'Beer'
  return 'Other'
}
function parseCSV(text){
  const rows=[], row=[]; let field='', inQ=false
  for (let i=0;i<text.length;i++){
    const c=text[i]
    if (c === '"'){ if (inQ && text[i+1] === '"'){ field+='"'; i++ } else inQ=!inQ }
    else if (c === ',' && !inQ){ row.push(field); field='' }
    else if ((c==='\n'||c==='\r') && !inQ){ if (field.length||row.length){ row.push(field); rows.push(row.splice(0,row.length)); field='' } }
    else field += c
  }
  if (field.length||row.length){ row.push(field); rows.push(row) }
  return rows
}
const CSV_HEADERS=['name','brand','category','subcategory','size','abv','country','region','vendor','sku','upc','cost_price','sell_price','description','tasting_notes','food_pairings','on_hand']
const sampleProducts = [
  { id: crypto.randomUUID(), name:'Casa Verde Blanco', brand:'Casa Verde', category:'Tequila/Mezcal', subcategory:'Tequila Blanco', size:'750ml', abv:'40%', country:'Mexico', region:'Jalisco', vendor:"Southern Glazer's", sku:'TEQ-001', upc:'0123456789012', cost_price:24.5, sell_price:39.99, description:'Vibrant agave with citrus and pepper.', tasting_notes:'Lime zest, white pepper, cooked agave', food_pairings:'Tacos al pastor, ceviche', on_hand:18 },
  { id: crypto.randomUUID(), name:'Old Mill Bourbon 6yr', brand:'Old Mill', category:'Whiskey', subcategory:'Bourbon', size:'750ml', abv:'47%', country:'USA', region:'Kentucky', vendor:'RNDC', sku:'BRB-201', upc:'0987654321098', cost_price:27.0, sell_price:49.99, description:'Toffee, cherry, and baking spice with a warm finish.', tasting_notes:'Toffee, cherry, cinnamon', food_pairings:'Smoked brisket, pecan pie', on_hand:9 },
  { id: crypto.randomUUID(), name:'Sunvale Pinot Noir', brand:'Sunvale', category:'Wine', subcategory:'Pinot Noir', size:'750ml', abv:'13.5%', country:'USA', region:'Oregon', vendor:'Premium Brands', sku:'WPN-310', upc:'0042000000123', cost_price:12.2, sell_price:21.99, description:'Silky red fruit and subtle oak.', tasting_notes:'Strawberry, cherry, vanilla', food_pairings:'Roast chicken, mushroom risotto', on_hand:34 },
]

function App(){
  const [products, setProducts] = useState([])
  const [query, setQuery] = useState('')
  const [admin, setAdmin] = useState(true) // on by default so you see controls
  const [filters, setFilters] = useState({ category:'', country:'', vendor:'', stock:'', priceRange:[0,200] })

  useEffect(()=>{
    try{
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
      setProducts(saved.length ? saved : sampleProducts)
    }catch{ setProducts(sampleProducts) }
  },[])
  useEffect(()=>{ try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(products)) }catch{} }, [products])

  const categories = useMemo(()=> [''].concat([...new Set(products.map(p=> p.category || guessCategory(p.name)))].sort()), [products])
  const countries  = useMemo(()=> [''].concat([...new Set(products.map(p=> p.country || ''))].filter(Boolean).sort()), [products])
  const vendors    = useMemo(()=> [''].concat([...new Set(products.map(p=> p.vendor  || ''))].filter(Boolean).sort()), [products])

  const filtered = useMemo(()=>{
    const q = query.trim().toLowerCase()
    return products.filter(p=>{
      const inQ = !q || [p.name,p.brand,p.category,p.subcategory,p.country,p.region,p.vendor,p.tasting_notes,p.description,p.food_pairings,p.sku,p.upc]
        .filter(Boolean).some(v=> String(v).toLowerCase().includes(q))
      if (!inQ) return false
      if (filters.category && (p.category || guessCategory(p.name)) !== filters.category) return false
      if (filters.country && p.country !== filters.country) return false
      if (filters.vendor && p.vendor !== filters.vendor) return false
      if (filters.stock==='in'  && !(toNumber(p.on_hand)>0)) return false
      if (filters.stock==='out' && !(toNumber(p.on_hand)<=0)) return false
      const price = toNumber(p.sell_price)
      if (isFinite(price)) {
        if (price < filters.priceRange[0] || price > filters.priceRange[1]) return false
      }
      return true
    })
  }, [products, query, filters])

  function importCSVFile(file){
    if (!file) return
    file.text().then(text=>{
      const rows = parseCSV(text).filter(r=> r.length && r.some(x=> x && x.trim().length))
      if (!rows.length) return alert('Empty CSV')
      const header = rows[0].map(h=> (h||'').trim().toLowerCase())
      const idx = k => header.indexOf(k)
      const list = rows.slice(1).map(r=>{
        const o = { id: crypto.randomUUID() }
        o.name = r[idx('name')] || ''
        o.brand = r[idx('brand')] || ''
        o.category = r[idx('category')] || guessCategory(o.name)
        o.subcategory = r[idx('subcategory')] || ''
        o.size = r[idx('size')] || ''
        o.abv = r[idx('abv')] || ''
        o.country = r[idx('country')] || ''
        o.region = r[idx('region')] || ''
        o.vendor = r[idx('vendor')] || ''
        o.sku = r[idx('sku')] || ''
        o.upc = r[idx('upc')] || ''
        o.cost_price = toNumber(r[idx('cost_price')])
        o.sell_price = toNumber(r[idx('sell_price')])
        o.description = r[idx('description')] || ''
        o.tasting_notes = r[idx('tasting_notes')] || ''
        o.food_pairings = r[idx('food_pairings')] || ''
        o.on_hand = toNumber(r[idx('on_hand')]) || 0
        return o
      }).filter(x=> x.name)
      if (!list.length) return alert('No valid rows. Check headers.')
      setProducts(list)
    }).catch(e=> alert('Import failed: '+ e.message))
  }

  const ProductCard = ({p}) => html`
    <div class="card" style=${{border:'1px solid #273142', borderRadius:'16px', background:'#151923', marginBottom:'12px'}}>
      <div class="content" style=${{padding:'14px 16px'}}>
        <div class="row" style=${{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <div style=${{fontWeight:700,fontSize:'16px'}}>${p.name || html`<span class="muted">(No name)</span>`}</div>
            <div class="muted" style=${{fontSize:'13px',marginTop:'4px'}}>${p.brand} · ${(p.category || guessCategory(p.name))}${p.subcategory?` · ${p.subcategory}`:''} · ${p.size}</div>
          </div>
          <div>
            <span class="badge" style=${{background:'#1f2937',padding:'4px 8px',borderRadius:'999px',fontSize:'12px'}}>
              ${isFinite(toNumber(p.sell_price))? currency(toNumber(p.sell_price)):'—'}
            </span>
            ${admin && html`<span class="badge" style=${{marginLeft:'6px'}}>Cost ${isFinite(toNumber(p.cost_price))? currency(toNumber(p.cost_price)):'—'}</span>`}
          </div>
        </div>
        <div style=${{fontSize:'13px',marginTop:'8px'}}>${p.description || ''}</div>
        <div style=${{fontSize:'13px'}}><b>Tasting:</b> ${p.tasting_notes || '—'}</div>
        <div style=${{fontSize:'13px'}}><b>Pairs with:</b> ${p.food_pairings || '—'}</div>
      </div>
    </div>
  `

  return html`
    <div>
      <div style=${{position:'sticky',top:0,zIndex:10,background:'rgba(15,17,21,.6)',backdropFilter:'blur(8px)',borderBottom:'1px solid #273142'}}>
        <div style=${{display:'flex',gap:'12px',alignItems:'center',padding:'12px 16px',maxWidth:'1200px',margin:'0 auto'}}>
          <div style=${{fontWeight:700,fontSize:'18px',color:'#23c55e'}}>Macadoodles</div>
          <div style=${{flex:1}}></div>
          <button class="btn" style=${btn()} onClick=${()=> setAdmin(a=>!a)}>${admin ? 'Admin ✓' : 'Admin'}</button>
          <input class="input" style=${input({width:'260px'})} placeholder="Search…" value=${query} onInput=${e=> setQuery(e.target.value)} />
        </div>
      </div>

      <div style=${container({paddingTop:'16px'})}>
        <div style=${grid(4)}>
          ${[
            html`<${Summary} title="Inventory Cost" value=${currency(filtered.reduce((s,p)=> s + (toNumber(p.cost_price)||0)*(toNumber(p.on_hand)||0), 0))} />`,
            html`<${Summary} title="Retail Value"  value=${currency(filtered.reduce((s,p)=> s + (toNumber(p.sell_price)||0)*(toNumber(p.on_hand)||0), 0))} />`,
            html`<${Summary} title="Items"         value=${filtered.length} />`,
          ]}
        </div>
      </div>

      <div style=${container({display:'flex',alignItems:'center',gap:'8px',paddingTop:'8px',paddingBottom:'8px'})}>
        ${admin && html`
          <input id="fileInput" type="file" accept=".csv" style="display:none" onChange=${e=> importCSVFile(e.target.files?.[0])}/>
          <label for="fileInput" class="btn" style="cursor:pointer">Import CSV</label>
        `}
        <div style=${{flex:1}}></div>
        <div class="row muted">Items: ${filtered.length}</div>
      </div>

      <div style=${container()}>
        ${filtered.map(p => html`<${ProductCard} key=${p.id} p=${p} />`)}
      </div>
    </div>
  `
}

const container = (extra={}) => ({maxWidth:'1200px',margin:'0 auto',padding:'0 16px',...extra})
const grid = (cols) => ({display:'grid',gridTemplateColumns:`repeat(${cols},minmax(0,1fr))`,gap:'12px'})
const btn = (extra={}) => ({background:'#1e2430',border:'1px solid #273142',color:'#e9eef8',padding:'8px 10px',borderRadius:'10px',cursor:'pointer',...extra})
const input = (extra={}) => ({background:'#0f1320',border:'1px solid #273142',color:'#e9eef8',padding:'8px 10px',borderRadius:'10px',...extra})

function Summary({title,value}){
  return html`<div style=${{background:'#151923',border:'1px solid #273142',borderRadius:'16px'}}>
    <div style=${{padding:'14px 16px'}}>
      <div style=${{color:'#9aa4b2',fontSize:'13px',marginBottom:'8px'}}>${title}</div>
      <div style=${{fontSize:'24px',fontWeight:700}}>${value}</div>
    </div>
  </div>`
}

ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App))
