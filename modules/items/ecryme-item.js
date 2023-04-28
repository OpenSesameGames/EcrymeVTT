import { EcrymeUtility } from "./ecryme-utility.js";

export const defaultItemImg = {
  weapon: "systems/fvtt-ecryme/images/icons/weapon.webp",
  equipement: "systems/fvtt-ecryme/images/icons/equipement.webp"
}

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export class EcrymeItem extends Item {

  constructor(data, context) {
    if (!data.img) {
      data.img = defaultItemImg[data.type];
    }
    super(data, context);
  }

}
