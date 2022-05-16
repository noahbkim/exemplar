int main()
{
    {
        int x = 1;
    }

    // Will this work?
    int y = x;

    int y = 1;

    // Is this allowed?
    {
        int y = 2;
    }

    // What's `y`?
}
