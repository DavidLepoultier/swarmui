package main 

import (
	"flag"
	"io"
	"log"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
)

type ConsulHandler struct {
	path string
}

func (h *ConsulHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	conn, err := net.Dial("tcp", h.path)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		log.Println(err)
		return
	}
	c := httputil.NewClientConn(conn, nil)
	defer c.Close()

	res, err := c.Do(r)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		log.Println(err)
		return
	}
	defer res.Body.Close()

	copyHeader(w.Header(), res.Header)
	if _, err := io.Copy(w, res.Body); err != nil {
		log.Println(err)
	}
}

func copyHeader(dst, src http.Header) {
	for k, vv := range src {
		for _, v := range vv {
			dst.Add(k, v)
		}
	}
}

func createTcpHandler(e string) http.Handler {
	u, err := url.Parse(e)
	if err != nil {
		log.Fatal(err)
	}
	return httputil.NewSingleHostReverseProxy(u)
}

func createHandler(dir string, e string, e2 string) http.Handler {
	var (
		mux         = http.NewServeMux()
		fileHandler = http.FileServer(http.Dir(dir))
		dockerHandler http.Handler
		h           http.Handler
	)

	h = createTcpHandler(e)
	dockerHandler = createTcpHandler(e2)

	mux.Handle("/consulapi/", http.StripPrefix("/consulapi", h))
	mux.Handle("/swarmuiapi/", http.StripPrefix("/swarmuiapi", dockerHandler))
	mux.Handle("/", fileHandler)
	return mux
}

func main() {

	consul := os.Args[1]

	var (
		endpoint = flag.String("e", consul, "Consul endpoint")
		endpoint2 = flag.String("e2", "http://localhost:9001", "Dockers endpoint")
		addr     = flag.String("p", ":9000", "Address and port to serve dockerui")
		assets   = flag.String("a", ".", "Path to the assets")
	)

	flag.Parse()

	handler := createHandler(*assets, *endpoint, *endpoint2)
	if err := http.ListenAndServe(*addr, handler); err != nil {
		log.Println(handler)
		log.Fatal(err)
	}
}
