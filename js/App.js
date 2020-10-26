import { html, render } from 'uhtml'

class App {
  constructor() {
    this.appElement = document.querySelector('#app')
    this.handle = null
    this.selectedFile = null
    this.draw()
  }

  async draw () {
    let phase = 'Loading'
    if (this.handle) phase = 'Overview'
    if (this.selectedFile === 'new') phase = 'New'
    if (this.selectedFile && this.selectedFile !== 'new') phase = 'Edit'
    render(this.appElement, await this[`template${phase}`]())
  }

  templateLoading () {
    return html`
      <h1>Hello!</h1>
      <button onclick=${async () => {
        await this.showFolderDialog()
        await this.draw()
      }}>Select folder</button>
    `
  }

  async templateSidebar () {
    const files = []
    for await (const entry of this.handle.getEntries()) {
      const isJsonLd = true // entry.name.substr(-4) === '.jsonld'
      if (entry.isFile && isJsonLd) {
        files.push(entry)
      }
    }

    return html`
      <ul>
        ${files.map(file => html`<li onclick=${() => {
          this.selectedFile = file
          this.draw()
        }}>${file.name}</li>`)}
      </ul>
      <button onclick=${() => {
        this.selectedFile = 'new'
        this.draw()
      }}>Create new prayer</button>
    `
  }

  async templateOverview () {

    return html`
      <h1>Files:</h1>
      ${await this.templateSidebar()}
    `
  }

  async templateEdit () {
    const file = await this.selectedFile.getFile();
    const text = await file.text()

    return html`
      <h1>Edit:</h1>
      ${await this.templateSidebar()}
            
      <rdf-form
        data=${text}
        onsave=${async event => {
          const text = JSON.stringify(event.detail, null, 2)
          const writable = await file.createWritable();
          await writable.write(text);
          await writable.close();
        }}
        form="http://rdf.danielbeeke.nl/prayer/prayer.form.ttl"
        selected-language="nl"
        i14n-languages='{"en": "English", "nl": "Nederlands"}'
        ui-languages='{"nl": "Nederlands"}'
        proxy="https://thingproxy.freeboard.io/fetch/">
      </rdf-form>
    `
  }

  async templateNew () {
    return html`
      <h1>New:</h1>
      ${await this.templateSidebar()}
            
      <rdf-form
        onsave=${async event => {
          const text = JSON.stringify(event.detail, null, 2)
          const title = event.detail['prayer:title']
          const fileName = title + '.jsonld'
          const newFileHandle = await this.handle.getFile(fileName, { create: true });
          const writable = await newFileHandle.createWritable();
          await writable.write(text);
          await writable.close();
        }}
        form="http://rdf.danielbeeke.nl/prayer/prayer.form.ttl"
        selected-language="nl"
        i14n-languages='{"en": "English", "nl": "Nederlands"}'
        ui-languages='{"nl": "Nederlands"}'
        proxy="https://thingproxy.freeboard.io/fetch/">
      </rdf-form>
    `
  }

  /**
   * Shows the OS folder dialog.
   */
  async showFolderDialog () {
    this.handle = await window.chooseFileSystemEntries({
      type: 'open-directory',
      readOnly: false,
    })
  }
}

new App()
