import { L, type LocalizedText } from "./localized-seed";

export type ProductI18n = {
    name: LocalizedText;
    description: LocalizedText;
    composition: LocalizedText;
};

/** Переводы демо-товаров: ru — источник, hy/en — проверенные варианты. */
export const PRODUCT_I18N: Record<string, ProductI18n> = {
    pepperoni: {
        name: L("Пепперони", "Պեպերոնի", "Pepperoni"),
        description: L(
            "Классическая пицца с острой колбасой пепперони и расплавленной моцареллой.",
            "Դասական պիցցա կծու պեպերոնի սոսիսով և հալած մոցարելայով։",
            "Classic pizza with spicy pepperoni and melted mozzarella.",
        ),
        composition: L(
            "Тесто, соус, моцарелла, пепперони",
            "Խմոր, սոուս, մոցարելա, պեպերոնի",
            "Dough, sauce, mozzarella, pepperoni",
        ),
    },
    margarita: {
        name: L("Маргарита", "Մարգարիտա", "Margherita"),
        description: L(
            "Нежная пицца с томатами, моцареллой и базиликом - итальянская классика.",
            "Նուրբ պիցցա լոլիկով, մոցարելայով և կիսոտով՝ իտալական դասական։",
            "Delicate pizza with tomatoes, mozzarella and basil - an Italian classic.",
        ),
        composition: L(
            "Тесто, соус, моцарелла, томаты",
            "Խմոր, սոուս, մոցարելա, լոլիկ",
            "Dough, sauce, mozzarella, tomatoes",
        ),
    },
    "four-cheese": {
        name: L("4 сыра", "4 պանիր", "Four cheese"),
        description: L(
            "Сливочная пицца с четырьмя видами сыра - насыщенный сырный вкус.",
            "Սերու պիցցա չորս տեսակի պանրով՝ հարուստ պանրային համով։",
            "Creamy pizza with four cheeses - rich cheesy flavor.",
        ),
        composition: L(
            "Моцарелла, пармезан, дор блю, чеддер",
            "Մոցարելա, պարմեզան, դոր բլյու, չեդեր",
            "Mozzarella, parmesan, dor blue, cheddar",
        ),
    },
    hawaiian: {
        name: L("Гавайская", "Հավայական", "Hawaiian"),
        description: L(
            "Сладкий ананас и ветчина в мягком тесте - любимый семейный вариант.",
            "Քաղցր արքայախնձոր և խոզի միս նուրբ խմորի մեջ՝ ընտանեկան սիրելի տարբերակ։",
            "Sweet pineapple and ham in soft dough - a family favorite.",
        ),
        composition: L(
            "Ветчина, ананас, моцарелла",
            "Խոզի միս, արքայախնձոր, մոցարելա",
            "Ham, pineapple, mozzarella",
        ),
    },
    myasnaya: {
        name: L("Мясная", "Մսային", "Meat lovers"),
        description: L(
            "Сытная пицца с говядиной, курицей и ветчиной - для большого аппетита.",
            "Հագեցնող պիցցա տավարով, հավով և խոզի մսով՝ մեծ ախորժակի համար։",
            "Hearty pizza with beef, chicken and ham - for a big appetite.",
        ),
        composition: L(
            "Говядина, курица, ветчина",
            "Տավար, հավ, խոզի միս",
            "Beef, chicken, ham",
        ),
    },
    "chicken-mushroom": {
        name: L("С курицей и грибами", "Հավով և սունկերով", "Chicken & mushroom"),
        description: L(
            "Нежное куриное филе и шампиньоны на сливочной основе.",
            "Նուրբ հավի ֆիլե և շամպինյոններ սերու հիմքի վրա։",
            "Tender chicken fillet and mushrooms on a creamy base.",
        ),
        composition: L(
            "Курица, шампиньоны",
            "Հավ, շամպինյոն",
            "Chicken, mushrooms",
        ),
    },
    vegetarian: {
        name: L("Вегетарианская", "Բուսակեր", "Vegetarian"),
        description: L(
            "Свежие овощи и оливки на тонком тесте - лёгкий и сбалансированный вариант.",
            "Թարմ բանջարեղեն և ձիթապտուղներ բարակ խմորի վրա՝ թեթև և հավասարակշռված տարբերակ։",
            "Fresh vegetables and olives on thin dough - light and balanced.",
        ),
        composition: L(
            "Перец, оливки, томаты",
            "Պղպեղ, ձիթապտուղ, լոլիկ",
            "Peppers, olives, tomatoes",
        ),
    },
    lahmajo: {
        name: L("Лахмаджо", "Լահմաջո", "Lahmajo"),
        description: L(
            "Тонкое тесто с ароматным фаршем и специями - армянская классика доставки.",
            "Բարակ խմոր բուրավետ ֆարշով և համեմունքներով՝ հայկական դասական առաքում։",
            "Thin dough with seasoned minced meat and spices - an Armenian delivery classic.",
        ),
        composition: L(
            "Тонкое тесто, фарш, томаты, специи",
            "Բարակ խմոր, ֆարշ, լոլիկ, համեմունքներ",
            "Thin dough, minced meat, tomatoes, spices",
        ),
    },
    philadelphia: {
        name: L("Филадельфия", "Ֆիլադելֆիա", "Philadelphia"),
        description: L(
            "Легендарный ролл с лососем и сливочным сыром.",
            "Լեգենդար ռոլ սաղմոնով և սերու պանրով։",
            "Legendary roll with salmon and cream cheese.",
        ),
        composition: L(
            "Лосось, сливочный сыр, нори",
            "Սաղմոն, սերու պանիր, նորի",
            "Salmon, cream cheese, nori",
        ),
    },
    california: {
        name: L("Калифорния", "Կալիֆորնիա", "California"),
        description: L(
            "Ролл с крабом, авокадо и огурцом в кунжуте.",
            "Ռոլ ծովախեցիկով, ավոկադոյով և վարունգով՝ քունջութի մեջ։",
            "Roll with crab, avocado and cucumber in sesame.",
        ),
        composition: L(
            "Краб, авокадо, огурец, кунжут",
            "Ծովախեցիկ, ավոկադո, վարունգ, քունջութ",
            "Crab, avocado, cucumber, sesame",
        ),
    },
    "unagi-roll": {
        name: L("Унаги ролл", "Ունագի ռոլ", "Unagi roll"),
        description: L(
            "Копчёный угорь с соусом унаги - сладкий и насыщенный вкус.",
            "Ծխած կամբարա ունագի սոուսով՝ քաղցր և հարուստ համով։",
            "Smoked eel with unagi sauce - sweet and rich flavor.",
        ),
        composition: L(
            "Угорь, соус унаги, кунжут",
            "Կամբարա, ունագի սոուս, քունջութ",
            "Eel, unagi sauce, sesame",
        ),
    },
    "ebi-roll": {
        name: L("Эби ролл", "Էբի ռոլ", "Ebi roll"),
        description: L(
            "Тигровая креветка и авокадо в классическом японском стиле.",
            "Վագրային մանրածաղկ և ավոկադո դասական ճապոնական ոճով։",
            "Tiger shrimp and avocado in classic Japanese style.",
        ),
        composition: L(
            "Тигровая креветка, авокадо",
            "Վագրային մանրածաղկ, ավոկադո",
            "Tiger shrimp, avocado",
        ),
    },
    "set-vostok": {
        name: L('Сет "Восток" 32 шт', 'Սեթ «Արևելք» 32 հատ', 'Set "East" 32 pcs'),
        description: L(
            "Большой сет из 32 штук: Филадельфия, Калифорния, Унаги и Эби.",
            "Մեծ սեթ 32 հատից՝ Ֆիլադելֆիա, Կալիֆորնիա, Ունագի և Էբի։",
            "Large set of 32 pcs: Philadelphia, California, Unagi and Ebi.",
        ),
        composition: L(
            "Филадельфия, Калифорния, Унаги, Эби",
            "Ֆիլադելֆիա, Կալիֆորնիա, Ունագի, Էբի",
            "Philadelphia, California, Unagi, Ebi",
        ),
    },
    "set-zapad": {
        name: L('Сет "Запад" 24 шт', 'Սեթ «Արևմուտք» 24 հատ', 'Set "West" 24 pcs'),
        description: L(
            "Сет из 24 штук: Калифорния, Тамаго и Каппа маки.",
            "Սեթ 24 հատից՝ Կալիֆորնիա, Տամագո և Կապպա մակի։",
            "Set of 24 pcs: California, Tamago and Kappa maki.",
        ),
        composition: L(
            "Калифорния, Тамаго, Каппа маки",
            "Կալիֆորնիա, Տամագո, Կապպա մակի",
            "California, Tamago, Kappa maki",
        ),
    },
    "onigiri-salmon": {
        name: L("Онигири лосось", "Օնիգիրի սաղմոն", "Salmon onigiri"),
        description: L(
            "Японский рисовый треугольник с лососем - удобный перекус.",
            "Ճապոնական բրինձե եռանկյուն սաղմոնով՝ հարմար նախուտեստ։",
            "Japanese rice triangle with salmon - a handy snack.",
        ),
        composition: L(
            "Рис, лосось, нори",
            "Բրինձ, սաղմոն, նորի",
            "Rice, salmon, nori",
        ),
    },
    "sashimi-salmon": {
        name: L("Сашими лосось", "Սաշիմի սաղմոն", "Salmon sashimi"),
        description: L(
            "Свежее филе лосося без риса - для ценителей чистого вкуса рыбы.",
            "Թարմ սաղմոնի ֆիլե առանց բրինձի՝ ձկան մաքուր համի սիրահարների համար։",
            "Fresh salmon fillet without rice - for lovers of pure fish flavor.",
        ),
        composition: L(
            "Филе лосося",
            "Սաղմոնի ֆիլե",
            "Salmon fillet",
        ),
    },
    "classic-chicken": {
        name: L("Классическая куриная", "Դասական հավով", "Classic chicken"),
        description: L(
            "Сочная курица, свежие овощи и фирменный соус в тёплом лаваше.",
            "Հյութեղ հավ, թարմ բանջարեղեն և ֆիրմային սոուս տաք լավաշի մեջ։",
            "Juicy chicken, fresh vegetables and house sauce in warm lavash.",
        ),
        composition: L(
            "Курица, лаваш, капуста, морковь, соус",
            "Հավ, լավաշ, կաղամբ, գազար, սոուս",
            "Chicken, lavash, cabbage, carrot, sauce",
        ),
    },
    "spicy-chicken": {
        name: L("Острая куриная", "Կծու հավով", "Spicy chicken"),
        description: L(
            "Курица с халапеньо и острым соусом - для любителей пикантного.",
            "Հավ հալապենյոյով և կծու սոուսով՝ կծուի սիրողների համար։",
            "Chicken with jalapeño and hot sauce - for spice lovers.",
        ),
        composition: L(
            "Курица, халапеньо, острый соус",
            "Հավ, հալապենյո, կծու սոուս",
            "Chicken, jalapeño, hot sauce",
        ),
    },
    "shawarma-cheese": {
        name: L("С сыром", "Պանրով", "With cheese"),
        description: L(
            "Курица с расплавленным сулугуни и свежими овощами.",
            "Հավ հալած սուլուգունիով և թարմ բանջարեղենով։",
            "Chicken with melted suluguni and fresh vegetables.",
        ),
        composition: L(
            "Курица, сулугуни, овощи",
            "Հավ, սուլուգունի, բանջարեղեն",
            "Chicken, suluguni, vegetables",
        ),
    },
    "shawarma-beef": {
        name: L("Мясная (Говядина)", "Տավարով", "Beef shawarma"),
        description: L(
            "Нежная говядина с овощами и специями в ароматном лаваше.",
            "Նուրբ տավար բանջարեղենով և համեմունքներով բուրավետ լավաշի մեջ։",
            "Tender beef with vegetables and spices in aromatic lavash.",
        ),
        composition: L(
            "Говядина, овощи, специи",
            "Տավար, բանջարեղեն, համեմունքներ",
            "Beef, vegetables, spices",
        ),
    },
    "french-fries": {
        name: L("Картофель фри", "Կարտոֆիլ ֆրի", "French fries"),
        description: L(
            "Золотистая хрустящая картошка - идеальное дополнение к любому заказу.",
            "Ոսկեգույն խրթխրթան կարտոֆիլ՝ ցանկացած պատվերի իդեալական հավելում։",
            "Golden crispy fries - the perfect side for any order.",
        ),
        composition: L(
            "Картофель, масло, соль",
            "Կարտոֆիլ, յուղ, աղ",
            "Potato, oil, salt",
        ),
    },
    "chicken-strips-6": {
        name: L("Стрипсы 6 шт", "Ստրիպս 6 հատ", "Strips 6 pcs"),
        description: L(
            "Шесть полосок куриного филе в хрустящей панировке.",
            "Վեց հատ հավի ֆիլե խրթխրթան պանրավորմամբ։",
            "Six strips of chicken fillet in crispy breading.",
        ),
        composition: L(
            "Филе курочки в панировке",
            "Հավի ֆիլե պանրավորմամբ",
            "Breaded chicken fillet",
        ),
    },
    "chicken-strips-9": {
        name: L("Стрипсы 9 шт", "Ստրիպս 9 հատ", "Strips 9 pcs"),
        description: L(
            "Девять полосок куриного филе в панировке - порция на компанию.",
            "Ինը հատ հավի ֆիլե պանրավորմամբ՝ ընկերների համար։",
            "Nine strips of breaded chicken fillet - shareable portion.",
        ),
        composition: L(
            "Филе курочки в панировке",
            "Հավի ֆիլե պանրավորմամբ",
            "Breaded chicken fillet",
        ),
    },
    "nuggets-9": {
        name: L("Наггетсы 9 шт", "Նագեթ 9 հատ", "Nuggets 9 pcs"),
        description: L(
            "Девять куриных наггетсов в золотистой панировке.",
            "Ինը հատ հավի նագեթ ոսկեգույն պանրավորմամբ։",
            "Nine chicken nuggets in golden breading.",
        ),
        composition: L(
            "Куриные наггетсы",
            "Հավի նագեթ",
            "Chicken nuggets",
        ),
    },
    "onion-rings": {
        name: L("Луковые кольца", "Սոխի օղակներ", "Onion rings"),
        description: L(
            "Хрустящие кольца лука в кляре - классика к шаурме и пицце.",
            "Խրթխրթան սոխի օղակներ խմորի մեջ՝ դասական հավելում շաուրմայի և պիցցայի համար։",
            "Crispy onion rings in batter - classic with shawarma and pizza.",
        ),
        composition: L(
            "Лук в кляре",
            "Սոխ խմորի մեջ",
            "Onion in batter",
        ),
    },
    "garlic-sauce": {
        name: L("Соус чесночный", "Սխտորի սոուս", "Garlic sauce"),
        description: L(
            "Ароматный чесночный соус с зеленью - к картофелю и стрипсам.",
            "Բուրավետ սխտորի սոուս կանաչեղենով՝ կարտոֆիլի և ստրիպսի համար։",
            "Aromatic garlic sauce with herbs - for fries and strips.",
        ),
        composition: L(
            "Чеснок, майонез, зелень",
            "Սխտոր, մայոնեզ, կանաչեղեն",
            "Garlic, mayonnaise, herbs",
        ),
    },
    "cola-05": {
        name: L("Кола 0.5 л", "Կոլա 0.5 լ", "Cola 0.5 L"),
        description: L(
            "Coca-Cola 0,5 л - освежающая классика к любому блюду.",
            "Coca-Cola 0,5 լ՝ թարմացնող դասական ցանկացած ուտեստի համար։",
            "Coca-Cola 0.5 L - refreshing classic with any dish.",
        ),
        composition: L("Coca-Cola", "Coca-Cola", "Coca-Cola"),
    },
    "cola-1": {
        name: L("Кола 1 л", "Կոլա 1 լ", "Cola 1 L"),
        description: L(
            "Coca-Cola 1 л - большая бутылка на компанию.",
            "Coca-Cola 1 լ՝ մեծ շիշ ընկերների համար։",
            "Coca-Cola 1 L - large bottle to share.",
        ),
        composition: L("Coca-Cola", "Coca-Cola", "Coca-Cola"),
    },
    "tan-05": {
        name: L("Тан 0.5 л", "Թան 0.5 լ", "Tan 0.5 L"),
        description: L(
            "Армянский тан 0,5 л - идеален к шаурме и пицце.",
            "Հայկական թան 0,5 լ՝ իդեալական է շաուրմայի և պիցցայի համար։",
            "Armenian tan 0.5 L - perfect with shawarma and pizza.",
        ),
        composition: L("Армянский тан", "Հայկական թան", "Armenian tan"),
    },
    "tan-1": {
        name: L("Тан 1 л", "Թան 1 լ", "Tan 1 L"),
        description: L(
            "Армянский тан 1 л - большая порция кисломолочного напитка.",
            "Հայկական թան 1 լ՝ մեծ բաժակ թթվալակտոզային ըմպելիքի։",
            "Armenian tan 1 L - large portion of fermented milk drink.",
        ),
        composition: L("Армянский тан", "Հայկական թան", "Armenian tan"),
    },
    "lemonade-dushes": {
        name: L("Лимонад Дюшес", "Դյուշես լիմոնադ", "Dushes lemonade"),
        description: L(
            "Грушевый лимонад Дюшес - знакомый вкус из детства.",
            "Տանձի լիմոնադ Դյուշես՝ ծանոթ համ մանկությանից։",
            "Pear lemonade Dushes - a familiar taste from childhood.",
        ),
        composition: L("Лимонад Дюшес", "Դյուշես լիմոնադ", "Dushes lemonade"),
    },
    "water-05": {
        name: L("Вода Аква 0.5 л", "Ակվա ջուր 0.5 լ", "Aqua water 0.5 L"),
        description: L(
            "Питьевая вода 0,5 л - чистая и освежающая.",
            "Խմելու ջուր 0,5 լ՝ մաքուր և թարմացնող։",
            "Drinking water 0.5 L - clean and refreshing.",
        ),
        composition: L("Питьевая вода", "Խմելու ջուր", "Drinking water"),
    },
    "dragon-roll": {
        name: L("Дракон", "Վիշապ", "Dragon Roll"),
        description: L(
            "Угорь, авокадо и соус унаги — сладкий насыщенный вкус.",
            "Կամբարա, ավոկադո և ունագի սոուս՝ քաղցր և հարուստ համով։",
            "Eel, avocado and unagi sauce — sweet and rich flavor.",
        ),
        composition: L(
            "Угорь, авокадо, рис, нори",
            "Կամբարա, ավոկադո, բրինձ, նորի",
            "Eel, avocado, rice, nori",
        ),
    },
    "shawarma-falafel": {
        name: L("Фалафель", "Ֆալաֆել", "Falafel"),
        description: L(
            "Хрустящий фалафель с овощами и тахини.",
            "Խրթխրթան ֆալաֆել բանջարեղենով և թահինիով։",
            "Crispy falafel with vegetables and tahini.",
        ),
        composition: L(
            "Фалафель, овощи, тахини, лаваш",
            "Ֆալաֆել, բանջարեղեն, թահինի, լավաշ",
            "Falafel, vegetables, tahini, lavash",
        ),
    },
    "shawarma-mixed": {
        name: L("Микс курица + говядина", "Հավ + տավար", "Chicken & Beef Mix"),
        description: L(
            "Комбо из курицы и говядины с фирменным соусом.",
            "Հավի և տավարի համադրություն ֆիրմային սոուսով։",
            "Combo of chicken and beef with house sauce.",
        ),
        composition: L(
            "Курица, говядина, овощи, соус",
            "Հավ, տավար, բանջարեղեն, սոուս",
            "Chicken, beef, vegetables, sauce",
        ),
    },
    "shawarma-bbq": {
        name: L("BBQ куриная", "BBQ հավով", "BBQ Chicken"),
        description: L(
            "Курица в дымном BBQ-соусе с хрустящим луком.",
            "Հավ կծու BBQ սոուսով և խրթխրթան սոխով։",
            "Chicken in smoky BBQ sauce with crispy onion.",
        ),
        composition: L(
            "Курица, BBQ-соус, лук, лаваш",
            "Հավ, BBQ սոուս, սոխ, լավաշ",
            "Chicken, BBQ sauce, onion, lavash",
        ),
    },
    "lahmajo-classic": {
        name: L("Классический", "Դասական", "Classic"),
        description: L(
            "Тонкое тесто с ароматным фаршем и специями.",
            "Բարակ խմոր բուրավետ ֆարշով և համեմունքներով։",
            "Thin dough with seasoned minced meat and spices.",
        ),
        composition: L(
            "Тесто, фарш, томаты, специи",
            "Խմոր, ֆարշ, լոլիկ, համեմունքներ",
            "Dough, minced meat, tomatoes, spices",
        ),
    },
    "lahmajo-spicy": {
        name: L("Острый", "Սուր", "Spicy"),
        description: L(
            "Лахмаджо с перцем чили и острыми специями.",
            "Լահմաջո չիլի պղպեղով և կծու համեմունքներով։",
            "Lahmajo with chili pepper and hot spices.",
        ),
        composition: L(
            "Фарш, перец чili, специи",
            "Ֆարշ, չիլի, համեմունքներ",
            "Minced meat, chili, spices",
        ),
    },
    "lahmajo-egg": {
        name: L("С яйцом", "Ձվով", "With Egg"),
        description: L(
            "Лахмаджо с яйцом на верху — сытный вариант.",
            "Լահմաջո ձվով վերևում՝ հագեցնող տարբերակ։",
            "Lahmajo topped with egg — a hearty option.",
        ),
        composition: L(
            "Фарш, яйцо, специи, тесто",
            "Ֆարշ, ձու, համեմունքներ, խմոր",
            "Minced meat, egg, spices, dough",
        ),
    },
    "lahmajo-mini": {
        name: L("Мини (2 шт)", "Մինի (2 հատ)", "Mini (2 pcs)"),
        description: L(
            "Две мини-лахмаджо — удобно на перекус.",
            "Երկու մինի լահմաջո՝ հարմար նախուտեստի համար։",
            "Two mini lahmajo — perfect for a snack.",
        ),
        composition: L(
            "Тонкое тесто, фарш, специи",
            "Բարակ խմոր, ֆարշ, համեմունքներ",
            "Thin dough, minced meat, spices",
        ),
    },
    "lahmajo-veggie": {
        name: L("Овощной", "Բուսական", "Vegetable"),
        description: L(
            "Лахмаджо с овощной начинкой без мяса.",
            "Լահմաջո բանջարեղena լրացumով առanc mса.",
            "Lahmajo with vegetable filling, no meat.",
        ),
        composition: L(
            "Овощи, томаты, специи, тесто",
            "Բanջarեղen, լոլիկ, համemunq, խmor",
            "Vegetables, tomatoes, spices, dough",
        ),
    },
    "lahmajo-combo": {
        name: L("Комбо с таном", "Թan-ov kombo", "Combo with Tan"),
        description: L(
            "Лахмаджо + армянский тан 0,5 л.",
            "Լahmajo + 0,5 l haykakan tan.",
            "Lahmajo + 0.5 L Armenian tan.",
        ),
        composition: L("Лахмаджо, тан", "Lahmajo, tan", "Lahmajo, tan"),
    },
    "lahmajo-family": {
        name: L("Семейный XL", "Ըntanekan XL", "Family XL"),
        description: L(
            "Большой лахмаджо на компанию из 3–4 человек.",
            "Mec lahmajo 3–4 hogow hamar.",
            "Large lahmajo for 3–4 people.",
        ),
        composition: L(
            "Фарш, тесто, специи",
            "Farsh, xmor, hameumunqner",
            "Minced meat, dough, spices",
        ),
    },
    "fries-large": {
        name: L("Большая порция", "Մեծ բաժին", "Large Portion"),
        description: L(
            "Увеличенная порция картофеля фри.",
            "Մեծացված կարտոֆիլ ֆրի բաժին։",
            "Extra-large portion of french fries.",
        ),
        composition: L(
            "Картофель, масло, соль",
            "Կարտոֆիլ, յուղ, աղ",
            "Potatoes, oil, salt",
        ),
    },
    "fries-cheese": {
        name: L("С сыром", "Պanրով", "Cheese Fries"),
        description: L(
            "Фри с расплавленным сыром чеддер.",
            "Ֆրի հալած չեդեր պanրով։",
            "Fries with melted cheddar cheese.",
        ),
        composition: L(
            "Картофель, сыр чеддер",
            "Կartofil, չeder",
            "Potatoes, cheddar cheese",
        ),
    },
    "fries-spicy": {
        name: L("Острый", "Սուր", "Spicy"),
        description: L(
            "Картофель фри с острым перцем и папrikой.",
            "Կartofil ֆri կծu պghpeghov.",
            "Fries with hot pepper and paprika.",
        ),
        composition: L(
            "Картофель, перец, пaprika",
            "Kartofil, պghpegh, paprika",
            "Potatoes, pepper, paprika",
        ),
    },
    "fries-sweet": {
        name: L("Из батата", "Բatata-ից", "Sweet Potato"),
        description: L(
            "Хрустящий бatata с лёгкой сладостью.",
            "Խrhstящ batata лёгкой сладостью.",
            "Crispy sweet potato fries.",
        ),
        composition: L(
            "Бatata, масло, соль",
            "Batata, յուղ, աղ",
            "Sweet potato, oil, salt",
        ),
    },
    "fries-combo": {
        name: L("Комбо с соусом", "Combo սоусov", "Combo with Sauce"),
        description: L(
            "Фри + чесночный соус.",
            "Fri + սխdorov соус.",
            "Fries + garlic sauce.",
        ),
        composition: L(
            "Картофель, чесночный соус",
            "Kartofil, սխdorov соус",
            "Potatoes, garlic sauce",
        ),
    },
    "fries-wedges": {
        name: L("Картофельные дольки", "Kartofil дolkեր", "Potato Wedges"),
        description: L(
            "Дольки картофеля с травами.",
            "Kartofil дolkեր травами.",
            "Potato wedges with herbs.",
        ),
        composition: L(
            "Картофель, травы, масло",
            "Kartofil, травы, յուղ",
            "Potatoes, herbs, oil",
        ),
    },
    "strips-4": {
        name: L("Стрипсы 4 шт", "Սtրիպս 4 հատ", "Strips 4 pcs"),
        description: L(
            "Четыре полоски куриного филе в панировке.",
            "Չորս հատ հav filе пanировkoy.",
            "Four breaded chicken fillet strips.",
        ),
        composition: L(
            "Куриное филе, пanировka",
            "Hav filе, пanировka",
            "Chicken fillet, breading",
        ),
    },
    "strips-spicy": {
        name: L("Острые стрипсы", "Սուր սtրիպս", "Spicy Strips"),
        description: L(
            "Стрипсы в острой пanировke.",
            "Strips սուր пanировkoy.",
            "Strips in spicy breading.",
        ),
        composition: L(
            "Курица, острые специи, пanировka",
            "Hav, սուր համemunq, пanировka",
            "Chicken, hot spices, breading",
        ),
    },
    "strips-combo": {
        name: L("Комбо стрипсы + фри", "Combo strips + fri", "Strips & Fries Combo"),
        description: L(
            "6 стрипсов и порция картофеля фри.",
            "6 strips + kartofil fri.",
            "6 strips and a portion of fries.",
        ),
        composition: L(
            "Стрипсы, картофель фри",
            "Strips, kartofil fri",
            "Strips, french fries",
        ),
    },
    "tenders-box": {
        name: L("Тендеры XL", "Tenders XL", "Tenders XL"),
        description: L(
            "Большая коробка куриных тenderов с соусом.",
            "Mec tenders корobka соусov.",
            "Large box of chicken tenders with sauce.",
        ),
        composition: L(
            "Куриные тenderы, соус",
            "Hav tenders, соус",
            "Chicken tenders, sauce",
        ),
    },
    "juice-orange": {
        name: L("Сок апельсин 0.5 л", "Portokal sok 0.5 L", "Orange Juice 0.5 L"),
        description: L(
            "Натуральный апельсиновый сок.",
            "Bnatir portokal sok.",
            "Natural orange juice.",
        ),
        composition: L(
            "Апельсиновый сок",
            "Portokal sok",
            "Orange juice",
        ),
    },
    "ayran-05": {
        name: L("Айran 0.5 л", "Ayran 0.5 L", "Ayran 0.5 L"),
        description: L(
            "Освежающий айran с солью.",
            "Tazatvogh ayran.",
            "Refreshing salted ayran.",
        ),
        composition: L("Айran", "Ayran", "Ayran"),
    },
};

export function getProductI18n(
    slug: string,
    fallback: { name: string; description: string; composition: string },
): ProductI18n {
    const hit = PRODUCT_I18N[slug];
    if (hit) return hit;
    return {
        name: L(fallback.name),
        description: L(fallback.description),
        composition: L(fallback.composition),
    };
}
