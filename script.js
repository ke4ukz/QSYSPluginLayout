function onHTMLEdit() {
    console.log(this.value);
    window.renderedHTMLPane.innerHTML = this.value;
}

window.addEventListener("DOMContentLoaded", ()=>{
    console.log("DOMContentLoaded")
    window.renderedHTMLPane = document.getElementById("render");
    document.getElementById("user_html").addEventListener("input", onHTMLEdit);
});