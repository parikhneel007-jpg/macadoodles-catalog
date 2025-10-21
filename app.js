/* global React, ReactDOM, htm */
const html = htm.bind(React.createElement)

function App(){
  return html`
    <div style=${{padding:'24px'}}>
      <h1>✅ It works</h1>
      <p>If you can see this, scripts are running correctly.</p>
    </div>
  `
}

ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App))
