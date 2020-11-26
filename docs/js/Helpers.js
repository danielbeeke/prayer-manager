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
