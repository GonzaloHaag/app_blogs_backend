/** Todas las rutas relacionadas con los blogs
 * la ruta sera /api/blogs, por lo tanto aqui debe ir / si es ahi, o /.... lo que siga, /:id
 */
const blogsRouter = require('express').Router();
const Blog = require('../models/blog');
const middleware = require('../utils/middleware');
const jwt = require('jsonwebtoken');
blogsRouter.get('/', async (request, response) => {
    const blogs = await Blog.find({}).populate('user', { username: 1, name: 1, id: 1 }); // datos del user a mostrar
    response.json(blogs)
})

blogsRouter.post('/',middleware.userExtractor,async (request, response, next) => {
    const body = request.body;
    // Procesar el token
    if (!request.token) {
        return response.status(401).json({ error: 'Token faltante o inválido' });
    }
    const decodedToken = jwt.verify(request.token, process.env.SECRET) // request.token por el middleware que armamos 
    if (!body.title || !body.url) {
        return response.status(400).json({ error: 'Title and url required' })
    }

    // obtén usuario desde el objeto de solicitud
    const user = request.user // gracias al middleware, llega por la request

    const blog = new Blog({
        title: body.title,
        author: body.author,
        url: body.url,
        likes: body.likes,
        user: user._id
    });
    try {
        const savedBlog = await blog.save();
        user.blogs = user.blogs.concat(savedBlog._id); // le concateno el blog guardado
        await user.save(); // para guardar el usuario con el blog
        response.status(201).json(savedBlog);
    } catch (exception) {
        next(exception)
    }
});

blogsRouter.delete('/:id', middleware.userExtractor, async (request, response, next) => {
    const blogId = request.params.id;
    const token = request.token;
  
    if (!token) return response.status(401).json({ error: 'Token faltante' });
  
    const decodedToken = jwt.verify(token, process.env.SECRET);
    if (!decodedToken.id) {
      return response.status(401).json({ error: 'Token inválido' });
    }
  
    try {
      const blog = await Blog.findById(blogId);
      if (!blog) {
        return response.status(404).json({ error: 'Blog no encontrado' });
      }
  
      if (!blog.user || blog.user.toString() !== decodedToken.id.toString()) {
        return response.status(401).json({ error: 'Usuario no autorizado' });
      }
  
      await Blog.findByIdAndDelete(blogId);
      response.status(204).end();
    } catch (exception) {
      next(exception);
    }
  });

blogsRouter.put('/:id', async (request, response, next) => {
    const blog = request.body;

    try {
        const updateBlog = await Blog.findByIdAndUpdate(request.params.id, blog, { new: true });
        response.json(updateBlog)
    } catch (exception) {
        next(exception)
    }

})
module.exports = blogsRouter