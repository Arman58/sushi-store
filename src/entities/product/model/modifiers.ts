export type MenuModifier = {
    id: number;
    name: string;
    priceDelta: number;
};

export type MenuModifierGroup = {
    id: number;
    name: string;
    required: boolean;
    /** 0 = без ограничения по числу выборов в группе */
    maxChoices: number;
    modifiers: MenuModifier[];
};
