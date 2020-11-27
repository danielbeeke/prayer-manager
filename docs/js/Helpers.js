import {Hole} from './vendor/uhtml.js'
import { icon } from './vendor/@fortawesome/fontawesome-svg-core.js'

class FaIcon extends Hole {
  constructor(icon) {
    super('svg', [icon], []);
  }
}

export function fa (iconInput) {
  return new FaIcon(icon(iconInput).html[0])
}

export const valueToArray = (value) => {
  return Array.isArray(value) ? value : [value]
}

function jsonld2turtle( jsonldString, store, uri ){
  return new Promise(resolve=>{
    $rdf.parse( jsonldString, store, uri, "application/ld+json", e => {
      if(e) { console.log("Parse Error! "); return resolve(e) }
      $rdf.serialize(null,store, uri,'text/turtle',(e,s)=>{
        if(e) { console.log("Serialize Error! "); return resolve(e) }
        return resolve(s)
      })
    })
  })
}
