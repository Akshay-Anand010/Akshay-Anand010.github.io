// Modal serves POST /ask until the Hugging Face account can host ZeroGPU.
// Workspace akshayanand771, app akshay-gpt, function web.
// In local preview the browser calls this dev server, which forwards to Modal.
// A direct call from port 5173 is rejected by Modal's CORS list.
const MODAL_ASK = "https://akshayanand771--akshay-gpt-web.modal.run/ask";
export const ASK_URL = import.meta.env.DEV ? "/ask" : MODAL_ASK;
export const SPACE_URL = "https://modal.com/apps/akshayanand771/main/deployed/akshay-gpt";
