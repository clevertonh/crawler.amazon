const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const fs = require('fs');

const BASE_URL = 'https://www.amazon.com.br';

//Lista inicial de categoriais, essa lista é fixa para descobrir as subcategorias
let lstCategoria = [];

const getCategoria = async () => {
  
  try {
    //Criar uma nova instância do navegador
    const browser = await puppeteer.launch({headless:  "new"});
    //const browser = await puppeteer.launch({headless:  false});
    //const browser = await puppeteer.launch({devtools: true})
    //Crie uma página dentro do navegador;
    const page = await browser.newPage();
    //Navegue até um site e defina a janela de visualização
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(BASE_URL, {timeout: 3000000});
    //Aguardar a renderização do menu lateral
    await page.waitForSelector('#nav-hamburger-menu');
    //Abre o menu
    await page.click('#nav-hamburger-menu');
    //Aguardar a renderização das categorias
    await page.waitForSelector('.hmenu-visible');
    //Maximiza a lista de categorias
    await page.click("#hmenu-content > ul.hmenu.hmenu-visible > li:nth-child(20) > a.hmenu-item.hmenu-compressed-btn");

    //Percorre as categorias
    lstCategoria.push(...await page.$$eval('#hmenu-content > ul > li:not(.hmenu-back-button) > a[data-menu-id]', links => {
      //debugger;
      //Percorre a lista de links retornada pelo filtro
      return links.map(link => {
        //Verifica se existe Tudo em no titulo, se tiver, nao adicoina
        if(!link.textContent.includes('Tudo em ') && !link.textContent.includes('menu principal')){
          //Remove algumas categorias, que são promocionais ou produtos amazon
          if(!['1','2','3','4','5','6','7'].includes(link.getAttribute("data-menu-id"))){
            //
            return {
              text: link.textContent.trim(),
              href: null,
              id: link.getAttribute("data-menu-id"),
              //ref: link.getAttribute("data-ref-tag"),
              idParent: null,
              level: 0,
              verify: false,
              endpoint: false
            };
          }
        }
      });
    }));

    console.log(`[Departamento] Quantidade: ${lstCategoria.length}`);

    //Percorre as categorias
    lstCategoria.push(...await page.$$eval('#hmenu-content > ul.hmenu.hmenu-visible > ul:nth-child(19) > li > a[data-menu-id]', links => {
      //debugger;
      //Percorre a lista de links retornada pelo filtro
      return links.map(link => {
        //Verifica se existe Tudo em no titulo, se tiver, nao adicoina
        if(!link.textContent.includes('Tudo em ') && !link.textContent.includes('menu principal')){
          //
          return {
            text: link.textContent.trim(),
            href: null,
            id: link.getAttribute("data-menu-id"),
            //ref: link.getAttribute("data-ref-tag"),
            idParent: null,
            level: 0,
            verify: false,
            endpoint: false
          };
        }
      });
    }));

    console.log(`[Departamento] Quantidade: ${lstCategoria.length}`);
    
    //Remove itens NULL da LISTA
    lstCategoria = lstCategoria.filter(item => item !== null);

    //Percorre a lista de categoria
    for (let i = 0; i < lstCategoria.length; i++) {
      //Verifica se o item ja foi buscado e tambem o LEVEL da categoria
      if(lstCategoria[i].verify === false && lstCategoria[i].level === 0){
        //Obtem os dados, verifica se recebeu algo para determinar se é um ENDPOINT
        let tmp = await page.$$eval(`#hmenu-content > ul[data-menu-id="${lstCategoria[i].id}"] > li > a`, links => {
          debugger;
          //Percorre a lista de links retornada pelo filtro
          return links.map(link => {
            //Verifica se existe Tudo em no titulo, se tiver, nao adicoina
            if(!link.textContent.includes('Tudo em ') && !link.textContent.includes('menu principal')){
              //
              const url = new URL(link.href);
              //
              let id = url.pathname.split('/')[2];
              //AVALIAR ISSO AQUI
              if(id === 'browse.html'){
                //
                return {
                  text: link.textContent.trim(),
                  href: decodeURIComponent(link.href),
                  idParent: null,
                  id: (id === 'browse.html') ? url.searchParams.get('node') : id, 
                  level: 1,
                  verify: false,
                  endpoint: false
                };
              }
            }
          });
        });     

        //
        lstCategoria[i].verify = true; //Informa que ja verificou o item
        lstCategoria[i].endpoint = tmp.length === 0; //Define se o item é endpoint

        //Remove itens NULL da LISTA
        tmp = tmp.filter(item => item !== null);

        //Percorre a lista temporaria, para terminar os registros e adiciona na lista
        lstCategoria.push(...tmp.map((item) => {
          //
          item.idParent = lstCategoria[i].id;
          //
          return item;
        }));
      
        //
        console.log(`[Departamento] Quantidade: ${lstCategoria.length}`); 
      }
    }

    //Remove itens NULL da LISTA
    lstCategoria = lstCategoria.filter(item => item !== null);

    //
    await getCategoriaSub(page, 1);
    //
    await getCategoriaSub(page, 2);
    

    
    //Fecha navegador
    await browser.close(); 

  } catch (error) {
    console.log(error);
  }
}

const getCategoriaSub = async (page, level) => {
  //Percorre a lista de categoria
  for (let i = 0; i < lstCategoria.length; i++) {
    //
    if(lstCategoria[i].verify === false && lstCategoria[i].level === level){
      //
      await page.goto(lstCategoria[i].href, {timeout: 3000000});
      //Percorre as categorias
      let tmp = await page.$$eval('li.apb-browse-refinements-indent-2 > span > a', links => {
        debugger;
        //Percorre a lista de links retornada pelo filtro
        return links.map(link => {
          //
          const url = new URL(link.href);
          //
          let listId = url.searchParams.get('rh');
          //
          return {
            text: link.textContent.trim(),
            href: decodeURIComponent(link.href),
            idParent: null,
            id: listId.split(',').slice(-1).toString().split(':').slice(-1).toString(),
            level: null,
            verify: false,
            endpoint: false
          };
        });
      }); 

      //
      lstCategoria[i].verify = true; //Informa que ja verificou o item
      lstCategoria[i].endpoint = tmp.length === 0; //Define se o item é endpoint

      //Remove itens NULL da LISTA
      tmp = tmp.filter(item => item !== null);

      //Percorre a lista temporaria, para terminar os registros e adiciona na lista
      lstCategoria.push(...tmp.map((item) => {
        //
        item.idParent = lstCategoria[i].id;
        item.level = (level + 1)
        //
        return item;
      }));
      
      //
      console.log(`[Departamento] Quantidade: ${lstCategoria.length}`)
    }
  }
}

const run = async () => {
  //
  await getCategoria();
  //
  fs.writeFileSync('lstCategoria.json', JSON.stringify(lstCategoria));
}

run();