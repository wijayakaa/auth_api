import Users from "../models/UserModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export const getUsers = async (req, res) => {
    try {
        const users = await Users.findAll({
            attributes: ['id', 'name', 'email']
        });
        res.json(users);
    } catch (error) {
        console.error(error)
    }
}

export const Register = async (req, res) => {
    const { name, email, password, confPass } = req.body;
    if (password !== confPass) return res.status(400).json({ message: "Passwords and confirm password was diffrent" });
    const salt = await bcrypt.genSalt(10);

    const hashedPassword = await bcrypt.hash(password, salt);

    try {
        await Users.create({
            name: name,
            email: email,
            password: hashedPassword
        });
        res.json({ message: "Register success" });
    } catch (error) {
        console.error(error);
    }
}

export const Login = async (req, res) => {
    try {
        const user = await Users.findAll({
            where: {
                email: req.body.email
            }
        });
        
        const match = await bcrypt.compare(req.body.password, user[0].password);
        if (!match) return res.status(400).json({ message: "Password was wrong" });
        const userID = user[0].id;
        const name = user[0].name;
        const email = user[0].email;
        const accesToken = jwt.sign({ userID, email, name }, process.env.ACCESS_TOKEN_SECRET, {
            expiresIn: "20s"
        });

        const refreshToken = jwt.sign({ userID, email, name }, process.env.REFRESH_TOKEN_SECRET, {
            expiresIn: "1d"
        });
        await Users.update({ refresh_token: refreshToken }, {
            where: { id: userID }
        });

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000,
        });
        res.json({ accesToken });

    } catch (error) {
        res.status(400).json({ message: "Email not found" });
    }
}

export const Logout = async (req, res) => {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) return res.sendStatus(204);
    const user = await Users.findAll({
        where: {
            refresh_token: refreshToken
        }
    });

    if (!user[0]) return res.sendStatus(204);

    const userId = user[0].id;
    await Users.update({ refresh_token: null }, {
        where: { id: userId }
    });

    res.clearCookie('refreshToken');
    return res.sendStatus(200);
}