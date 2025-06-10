export function resizeLogoImage(blockSize = '3rem'){
    customElements.whenDefined('calcite-navigation-logo').then(() => {

        const shell = document.querySelector('calcite-shell');
        const navigation = shell.querySelector('calcite-navigation');
        const logo = navigation.querySelector('calcite-navigation-logo');
    
        const srAccess = () => {
            if (logo.shadowRoot) {
                // console.log('Shadow root è disponibile:', logo.shadowRoot);

                // Modifiche sui nodi di shadowRoot
                const img = logo.shadowRoot.querySelector('div.container').querySelector('img.image');
                img.style.blockSize = 3 + 'rem';
            } else {
                setTimeout(srAccess, 50); // riprova finché non è pronto
            }
    };
        srAccess();
    });
}

export function resizeProvnaLogoImage(blockSize = '3.5 rem'){
    customElements.whenDefined('calcite-navigation-user').then(() => {

        const shell = document.querySelector('calcite-shell');
        const navigation = shell.querySelector('calcite-navigation');
        const logo = navigation.querySelector('calcite-navigation-user');
    
        const srAccess = () => {
            if (logo.shadowRoot) {
                console.log('Shadow root è disponibile:', logo.shadowRoot);

                // Modifiche sui nodi di shadowRoot
                const img = logo.shadowRoot.querySelector('button').querySelector('calcite-avatar');
                img.style.blockSize = 3.5 + 'rem';
                img.style.inlineSize = 3.5 + 'rem';
            } else {
                setTimeout(srAccess, 50); // riprova finché non è pronto
            }
    };
        srAccess();
    });
}