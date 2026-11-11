EVIDENCE SUROVIN – PWA pro iPhone (zdrojové soubory)

Co je připraveno:
- vytvoření zakázek s názvem a datem,
- fotografování zadním fotoaparátem telefonu,
- automatické uložení fotky do lokální databáze aplikace,
- přehled fotografií podle zakázky,
- export celé zakázky do ZIPu se složkou zakázky a očíslovanými JPG,
- offline režim po prvním načtení.

DŮLEŽITÉ OMEZENÍ iOS:
Safari/PWA nemá podporované univerzální oprávnění pro automatický zápis do zvolené
složky v aplikaci Soubory. Proto se snímky nejprve ukládají do lokální databáze
aplikace. Tlačítko „Exportovat zakázku“ otevře systémové sdílení; na iPhonu zvol
„Uložit do Souborů“ a vyber cílovou složku. ZIP obsahuje složku zakázky a všechny
fotografie. Po rozbalení získáš požadovanou strukturu složek.

NASAZENÍ:
PWA vyžaduje HTTPS hosting (nefunguje instalace na plochu z pouhého lokálního
HTML souboru). Nahraj obsah tohoto ZIPu do statického HTTPS hostingu, například
GitHub Pages. Poté na iPhonu otevři adresu v Safari -> Sdílet -> Přidat na plochu.

POZNÁMKA K WINDOWS:
K úpravě souborů stačí Windows a běžný editor. Pro zveřejnění je třeba jednorázově
umístit soubory na HTTPS hosting. Data uživatelů se na hosting neposílají; hosting
slouží pouze k doručení aplikace. Fotografie zůstávají v úložišti Safari na iPhonu.
Vymazání dat webu/Safari nebo odinstalace aplikace může lokální fotografie odstranit,
proto pravidelně exportuj zálohy zakázek.
